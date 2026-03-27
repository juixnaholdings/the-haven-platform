from django.db import transaction

from apps.common.audit import AuditEventType, AuditTargetType
from apps.common import services as common_services
from apps.members.models import Member


def _set_audit_fields(instance, *, actor, is_create: bool = False) -> None:
    if not actor or not actor.is_authenticated:
        return

    if is_create and instance.created_by_id is None:
        instance.created_by = actor
    instance.updated_by = actor


@transaction.atomic
def create_member(*, data: dict, actor=None) -> Member:
    member = Member(**data)
    _set_audit_fields(member, actor=actor, is_create=True)
    member.save()

    common_services.log_audit_event(
        actor=actor,
        event_type=AuditEventType.MEMBER_CREATED,
        target_type=AuditTargetType.MEMBER,
        target_id=member.id,
        summary=f"Created member '{member.full_name}'.",
        payload={"is_active": member.is_active},
    )
    return member


@transaction.atomic
def update_member(*, member: Member, data: dict, actor=None) -> Member:
    changed_fields = sorted(data.keys())
    for field, value in data.items():
        setattr(member, field, value)

    _set_audit_fields(member, actor=actor)
    member.save()

    common_services.log_audit_event(
        actor=actor,
        event_type=AuditEventType.MEMBER_UPDATED,
        target_type=AuditTargetType.MEMBER,
        target_id=member.id,
        summary=f"Updated member '{member.full_name}'.",
        payload={"changed_fields": changed_fields, "is_active": member.is_active},
    )
    return member
