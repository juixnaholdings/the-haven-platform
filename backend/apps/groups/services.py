from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.groups.models import Group, GroupMembership


def _set_audit_fields(instance, *, actor, is_create: bool = False) -> None:
    if not actor or not actor.is_authenticated:
        return

    if is_create and instance.created_by_id is None:
        instance.created_by = actor
    instance.updated_by = actor


def _validate_membership_dates(*, started_on, ended_on, is_active) -> None:
    if started_on and ended_on and ended_on < started_on:
        raise ValidationError({"ended_on": ["End date cannot be earlier than start date."]})

    if is_active and ended_on is not None:
        raise ValidationError({"ended_on": ["Active affiliations cannot have an end date."]})


def _ensure_no_duplicate_active_affiliation(*, group, member, membership=None) -> None:
    existing_membership = GroupMembership.objects.filter(
        group=group,
        member=member,
        is_active=True,
    )
    if membership is not None:
        existing_membership = existing_membership.exclude(id=membership.id)

    if existing_membership.exists():
        raise ValidationError(
            {
                "member_id": [
                    "Member already has an active affiliation with this group."
                ]
            }
        )


@transaction.atomic
def create_group(*, data: dict, actor=None) -> Group:
    group = Group(**data)
    _set_audit_fields(group, actor=actor, is_create=True)
    group.save()
    return group


@transaction.atomic
def update_group(*, group: Group, data: dict, actor=None) -> Group:
    for field, value in data.items():
        setattr(group, field, value)

    _set_audit_fields(group, actor=actor)
    group.save()
    return group


@transaction.atomic
def add_member_to_group(
    *,
    group: Group,
    member,
    role_name: str = "",
    started_on=None,
    ended_on=None,
    notes: str = "",
    actor=None,
) -> GroupMembership:
    _validate_membership_dates(started_on=started_on, ended_on=ended_on, is_active=True)
    _ensure_no_duplicate_active_affiliation(group=group, member=member)

    membership = GroupMembership(
        group=group,
        member=member,
        role_name=role_name,
        started_on=started_on,
        ended_on=None,
        notes=notes,
        is_active=True,
    )
    _set_audit_fields(membership, actor=actor, is_create=True)
    membership.save()
    return membership


@transaction.atomic
def update_group_membership(*, membership: GroupMembership, data: dict, actor=None) -> GroupMembership:
    target_is_active = data.get("is_active", membership.is_active)
    if target_is_active and "ended_on" in data and data["ended_on"] is not None:
        raise ValidationError({"ended_on": ["Active affiliations cannot have an end date."]})

    for field in ("role_name", "started_on", "ended_on", "is_active", "notes"):
        if field in data:
            setattr(membership, field, data[field])

    if membership.is_active:
        membership.ended_on = None
        _ensure_no_duplicate_active_affiliation(
            group=membership.group,
            member=membership.member,
            membership=membership,
        )
    else:
        membership.ended_on = membership.ended_on or timezone.localdate()

    _validate_membership_dates(
        started_on=membership.started_on,
        ended_on=membership.ended_on,
        is_active=membership.is_active,
    )

    _set_audit_fields(membership, actor=actor)
    membership.save()
    return membership


@transaction.atomic
def deactivate_group_membership(*, membership: GroupMembership, ended_on=None, actor=None) -> GroupMembership:
    data = {"is_active": False}
    if ended_on is not None:
        data["ended_on"] = ended_on
    return update_group_membership(membership=membership, data=data, actor=actor)


@transaction.atomic
def reactivate_group_membership(*, membership: GroupMembership, started_on=None, actor=None) -> GroupMembership:
    data = {"is_active": True}
    if started_on is not None:
        data["started_on"] = started_on
    return update_group_membership(membership=membership, data=data, actor=actor)
