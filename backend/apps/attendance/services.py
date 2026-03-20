from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.attendance.models import AttendanceSummary, MemberAttendance, ServiceEvent


def _set_audit_fields(instance, *, actor, is_create: bool = False) -> None:
    if not actor or not actor.is_authenticated:
        return

    if is_create and instance.created_by_id is None:
        instance.created_by = actor
    instance.updated_by = actor


def _validate_service_event_times(*, start_time, end_time) -> None:
    if start_time and end_time and end_time < start_time:
        raise ValidationError({"end_time": ["End time cannot be earlier than start time."]})


def _validate_summary_counts(*, men_count, women_count, children_count, visitor_count, total_count) -> None:
    expected_total = men_count + women_count + children_count
    if total_count != expected_total:
        raise ValidationError(
            {"total_count": ["Total count must equal men, women, and children counts combined."]}
        )

    if visitor_count > total_count:
        raise ValidationError({"visitor_count": ["Visitor count cannot exceed the total count."]})


def _ensure_no_duplicate_member_attendance(*, service_event, member, member_attendance=None) -> None:
    existing_record = MemberAttendance.objects.filter(service_event=service_event, member=member)
    if member_attendance is not None:
        existing_record = existing_record.exclude(id=member_attendance.id)

    if existing_record.exists():
        raise ValidationError(
            {
                "member_id": [
                    "Member attendance has already been recorded for this service event."
                ]
            }
        )


@transaction.atomic
def create_service_event(*, data: dict, actor=None) -> ServiceEvent:
    _validate_service_event_times(
        start_time=data.get("start_time"),
        end_time=data.get("end_time"),
    )

    service_event = ServiceEvent(**data)
    _set_audit_fields(service_event, actor=actor, is_create=True)
    service_event.save()
    return service_event


@transaction.atomic
def update_service_event(*, service_event: ServiceEvent, data: dict, actor=None) -> ServiceEvent:
    start_time = data.get("start_time", service_event.start_time)
    end_time = data.get("end_time", service_event.end_time)
    _validate_service_event_times(start_time=start_time, end_time=end_time)

    for field, value in data.items():
        setattr(service_event, field, value)

    _set_audit_fields(service_event, actor=actor)
    service_event.save()
    return service_event


@transaction.atomic
def create_or_update_attendance_summary(*, service_event: ServiceEvent, data: dict, actor=None) -> AttendanceSummary:
    summary = getattr(service_event, "attendance_summary", None)
    if summary is None:
        summary = AttendanceSummary(service_event=service_event)
        is_create = True
    else:
        is_create = False

    values = {
        "men_count": data.get("men_count", summary.men_count or 0),
        "women_count": data.get("women_count", summary.women_count or 0),
        "children_count": data.get("children_count", summary.children_count or 0),
        "visitor_count": data.get("visitor_count", summary.visitor_count or 0),
        "total_count": data.get("total_count", summary.total_count or 0),
    }
    _validate_summary_counts(**values)

    for field, value in data.items():
        setattr(summary, field, value)

    _set_audit_fields(summary, actor=actor, is_create=is_create)
    summary.save()
    return summary


@transaction.atomic
def record_member_attendance(
    *,
    service_event: ServiceEvent,
    member,
    status: str,
    checked_in_at=None,
    notes: str = "",
    actor=None,
) -> MemberAttendance:
    _ensure_no_duplicate_member_attendance(service_event=service_event, member=member)

    member_attendance = MemberAttendance(
        service_event=service_event,
        member=member,
        status=status,
        checked_in_at=checked_in_at,
        notes=notes,
    )
    _set_audit_fields(member_attendance, actor=actor, is_create=True)
    member_attendance.save()
    return member_attendance


@transaction.atomic
def update_member_attendance(*, member_attendance: MemberAttendance, data: dict, actor=None) -> MemberAttendance:
    service_event = data.get("service_event", member_attendance.service_event)
    member = data.get("member", member_attendance.member)
    _ensure_no_duplicate_member_attendance(
        service_event=service_event,
        member=member,
        member_attendance=member_attendance,
    )

    for field in ("status", "checked_in_at", "notes"):
        if field in data:
            setattr(member_attendance, field, data[field])

    _set_audit_fields(member_attendance, actor=actor)
    member_attendance.save()
    return member_attendance
