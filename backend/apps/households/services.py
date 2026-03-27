from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.common.audit import AuditEventType, AuditTargetType
from apps.common import services as common_services
from apps.households.models import Household, HouseholdMembership, HouseholdRelationship


def _set_audit_fields(instance, *, actor, is_create: bool = False) -> None:
    if not actor or not actor.is_authenticated:
        return

    if is_create and instance.created_by_id is None:
        instance.created_by = actor
    instance.updated_by = actor


def _validate_membership_dates(*, joined_on, left_on) -> None:
    if joined_on and left_on and left_on < joined_on:
        raise ValidationError({"left_on": ["Left date cannot be earlier than joined date."]})


def _ensure_member_has_no_other_active_membership(*, member, membership=None) -> None:
    existing_membership = HouseholdMembership.objects.filter(member=member, is_active=True)
    if membership is not None:
        existing_membership = existing_membership.exclude(id=membership.id)

    conflict = existing_membership.select_related("household").first()
    if conflict is not None:
        raise ValidationError(
            {
                "member_id": [
                    f"Member already has an active household membership in '{conflict.household.name}'."
                ]
            }
        )


def _ensure_household_has_no_other_active_head(*, household, membership=None) -> None:
    existing_head = HouseholdMembership.objects.filter(
        household=household,
        is_active=True,
        is_head=True,
    )
    if membership is not None:
        existing_head = existing_head.exclude(id=membership.id)

    if existing_head.exists():
        raise ValidationError({"is_head": ["Only one active household head is allowed."]})


@transaction.atomic
def create_household(*, data: dict, actor=None) -> Household:
    household = Household(**data)
    _set_audit_fields(household, actor=actor, is_create=True)
    household.save()
    return household


@transaction.atomic
def update_household(*, household: Household, data: dict, actor=None) -> Household:
    for field, value in data.items():
        setattr(household, field, value)

    _set_audit_fields(household, actor=actor)
    household.save()
    return household


@transaction.atomic
def add_member_to_household(
    *,
    household: Household,
    member,
    relationship_to_head: str = HouseholdRelationship.OTHER,
    is_head: bool = False,
    joined_on=None,
    left_on=None,
    notes: str = "",
    actor=None,
) -> HouseholdMembership:
    _validate_membership_dates(joined_on=joined_on, left_on=left_on)
    _ensure_member_has_no_other_active_membership(member=member)

    if is_head:
        _ensure_household_has_no_other_active_head(household=household)
        relationship_to_head = HouseholdRelationship.HEAD

    membership = HouseholdMembership(
        household=household,
        member=member,
        relationship_to_head=relationship_to_head,
        is_head=is_head,
        joined_on=joined_on,
        left_on=left_on,
        notes=notes,
    )
    _set_audit_fields(membership, actor=actor, is_create=True)
    membership.save()

    common_services.log_audit_event(
        actor=actor,
        event_type=AuditEventType.HOUSEHOLD_MEMBERSHIP_CREATED,
        target_type=AuditTargetType.HOUSEHOLD_MEMBERSHIP,
        target_id=membership.id,
        summary=(
            f"Added member '{member.full_name}' to household '{household.name}'."
        ),
        payload={
            "household_id": household.id,
            "member_id": member.id,
            "is_head": membership.is_head,
            "is_active": membership.is_active,
        },
    )
    return membership


@transaction.atomic
def update_household_membership(*, membership: HouseholdMembership, data: dict, actor=None) -> HouseholdMembership:
    changed_fields = sorted(data.keys())
    for field in ("relationship_to_head", "is_head", "is_active", "joined_on", "left_on", "notes"):
        if field in data:
            setattr(membership, field, data[field])

    _validate_membership_dates(joined_on=membership.joined_on, left_on=membership.left_on)

    if membership.is_active:
        _ensure_member_has_no_other_active_membership(member=membership.member, membership=membership)
        if membership.is_head:
            _ensure_household_has_no_other_active_head(
                household=membership.household,
                membership=membership,
            )
            membership.relationship_to_head = HouseholdRelationship.HEAD
    else:
        membership.is_head = False
        if membership.relationship_to_head == HouseholdRelationship.HEAD:
            membership.relationship_to_head = HouseholdRelationship.OTHER

    _set_audit_fields(membership, actor=actor)
    membership.save()

    common_services.log_audit_event(
        actor=actor,
        event_type=AuditEventType.HOUSEHOLD_MEMBERSHIP_UPDATED,
        target_type=AuditTargetType.HOUSEHOLD_MEMBERSHIP,
        target_id=membership.id,
        summary=(
            f"Updated household membership for member '{membership.member.full_name}' "
            f"in '{membership.household.name}'."
        ),
        payload={
            "household_id": membership.household_id,
            "member_id": membership.member_id,
            "changed_fields": changed_fields,
            "is_head": membership.is_head,
            "is_active": membership.is_active,
        },
    )
    return membership


@transaction.atomic
def set_household_head(*, household: Household, membership: HouseholdMembership, actor=None) -> HouseholdMembership:
    if membership.household_id != household.id:
        raise ValidationError({"membership_id": ["Membership does not belong to the target household."]})

    if not membership.is_active:
        raise ValidationError({"membership_id": ["Only an active household membership can be the head."]})

    current_heads = HouseholdMembership.objects.filter(
        household=household,
        is_active=True,
        is_head=True,
    ).exclude(id=membership.id)

    for current_head in current_heads:
        current_head.is_head = False
        if current_head.relationship_to_head == HouseholdRelationship.HEAD:
            current_head.relationship_to_head = HouseholdRelationship.OTHER
        _set_audit_fields(current_head, actor=actor)
        current_head.save()

    membership.is_head = True
    membership.relationship_to_head = HouseholdRelationship.HEAD
    _set_audit_fields(membership, actor=actor)
    membership.save()

    common_services.log_audit_event(
        actor=actor,
        event_type=AuditEventType.HOUSEHOLD_MEMBERSHIP_UPDATED,
        target_type=AuditTargetType.HOUSEHOLD_MEMBERSHIP,
        target_id=membership.id,
        summary=(
            f"Set member '{membership.member.full_name}' as head of household "
            f"'{household.name}'."
        ),
        payload={
            "household_id": household.id,
            "member_id": membership.member_id,
            "is_head": True,
            "is_active": membership.is_active,
        },
    )
    return membership
