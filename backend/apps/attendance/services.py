from datetime import timedelta, time

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.common.audit import AuditEventType, AuditTargetType
from apps.common import services as common_services
from apps.attendance.models import (
    AttendanceSummary,
    MemberAttendance,
    ServiceEvent,
    ServiceEventType,
)


SYSTEM_SUNDAY_EVENT_TITLE = "Sunday Service"
SYSTEM_SUNDAY_EVENT_LOCATION = "Main Sanctuary"
SYSTEM_SUNDAY_START_TIME = time(hour=9, minute=0)
SYSTEM_SUNDAY_END_TIME = time(hour=11, minute=30)
SYSTEM_SUNDAY_EVENT_NOTE = (
    "System-managed Sunday service event. Use this event for weekly attendance tracking."
)


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


def _resolve_reference_date(reference_date=None):
    if reference_date is None:
        return timezone.localdate()
    return reference_date


def _current_week_sunday(*, reference_date):
    days_since_sunday = (reference_date.weekday() + 1) % 7
    return reference_date - timedelta(days=days_since_sunday)


def _iter_sunday_dates(*, start_date, end_date):
    current = start_date
    while current <= end_date:
        yield current
        current += timedelta(days=7)


@transaction.atomic
def ensure_system_managed_sunday_services(
    *,
    weeks_back: int = 8,
    weeks_forward: int = 12,
    reference_date=None,
    actor=None,
) -> list[ServiceEvent]:
    if weeks_back < 0 or weeks_forward < 0:
        raise ValidationError(
            {"detail": ["weeks_back and weeks_forward must be zero or greater."]}
        )

    resolved_reference_date = _resolve_reference_date(reference_date)
    current_sunday = _current_week_sunday(reference_date=resolved_reference_date)
    start_sunday = current_sunday - timedelta(days=weeks_back * 7)
    end_sunday = current_sunday + timedelta(days=weeks_forward * 7)

    managed_sundays = []
    for sunday_date in _iter_sunday_dates(start_date=start_sunday, end_date=end_sunday):
        service_event, created = ServiceEvent.objects.get_or_create(
            event_type=ServiceEventType.SUNDAY_SERVICE,
            service_date=sunday_date,
            is_system_managed=True,
            defaults={
                "title": SYSTEM_SUNDAY_EVENT_TITLE,
                "start_time": SYSTEM_SUNDAY_START_TIME,
                "end_time": SYSTEM_SUNDAY_END_TIME,
                "location": SYSTEM_SUNDAY_EVENT_LOCATION,
                "notes": SYSTEM_SUNDAY_EVENT_NOTE,
                "is_active": True,
            },
        )

        if created:
            if actor and actor.is_authenticated:
                _set_audit_fields(service_event, actor=actor, is_create=True)
                service_event.save(update_fields=["created_by", "updated_by"])
        else:
            changed_fields = []
            if not service_event.is_active:
                service_event.is_active = True
                changed_fields.append("is_active")

            if service_event.updated_by_id is None and actor and actor.is_authenticated:
                service_event.updated_by = actor
                changed_fields.append("updated_by")

            if changed_fields:
                service_event.save(update_fields=changed_fields)

        managed_sundays.append(service_event)

    return managed_sundays


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

    common_services.log_audit_event(
        actor=actor,
        event_type=(
            AuditEventType.ATTENDANCE_SUMMARY_CREATED
            if is_create
            else AuditEventType.ATTENDANCE_SUMMARY_UPDATED
        ),
        target_type=AuditTargetType.ATTENDANCE_SUMMARY,
        target_id=summary.id,
        summary=(
            f"{'Created' if is_create else 'Updated'} attendance summary for "
            f"'{service_event.title}' ({service_event.service_date})."
        ),
        payload={
            "service_event_id": service_event.id,
            "men_count": summary.men_count,
            "women_count": summary.women_count,
            "children_count": summary.children_count,
            "visitor_count": summary.visitor_count,
            "total_count": summary.total_count,
        },
    )
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

    common_services.log_audit_event(
        actor=actor,
        event_type=AuditEventType.MEMBER_ATTENDANCE_CREATED,
        target_type=AuditTargetType.MEMBER_ATTENDANCE,
        target_id=member_attendance.id,
        summary=(
            f"Recorded member attendance for '{member.full_name}' in "
            f"'{service_event.title}' ({service_event.service_date})."
        ),
        payload={
            "service_event_id": service_event.id,
            "member_id": member.id,
            "status": member_attendance.status,
        },
    )
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

    changed_fields = sorted(field for field in ("status", "checked_in_at", "notes") if field in data)

    for field in ("status", "checked_in_at", "notes"):
        if field in data:
            setattr(member_attendance, field, data[field])

    _set_audit_fields(member_attendance, actor=actor)
    member_attendance.save()

    common_services.log_audit_event(
        actor=actor,
        event_type=AuditEventType.MEMBER_ATTENDANCE_UPDATED,
        target_type=AuditTargetType.MEMBER_ATTENDANCE,
        target_id=member_attendance.id,
        summary=(
            f"Updated member attendance for '{member_attendance.member.full_name}' in "
            f"'{member_attendance.service_event.title}' "
            f"({member_attendance.service_event.service_date})."
        ),
        payload={
            "service_event_id": member_attendance.service_event_id,
            "member_id": member_attendance.member_id,
            "changed_fields": changed_fields,
            "status": member_attendance.status,
        },
    )
    return member_attendance
