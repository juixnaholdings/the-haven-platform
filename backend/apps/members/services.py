from django.db import transaction

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
    return member


@transaction.atomic
def update_member(*, member: Member, data: dict, actor=None) -> Member:
    for field, value in data.items():
        setattr(member, field, value)

    _set_audit_fields(member, actor=actor)
    member.save()
    return member
