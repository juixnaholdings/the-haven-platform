from django.db.models import Count, Exists, OuterRef, Prefetch, Q

from apps.attendance.models import AttendanceSummary, MemberAttendance, ServiceEvent


def _ordered_member_attendance_queryset():
    return MemberAttendance.objects.select_related("member").order_by(
        "member__last_name",
        "member__first_name",
        "id",
    )


def list_service_events(*, filters: dict | None = None):
    filters = filters or {}
    summary_exists = AttendanceSummary.objects.filter(service_event_id=OuterRef("pk"))
    queryset = ServiceEvent.objects.annotate(
        member_attendance_count=Count("member_attendances", distinct=True),
        has_attendance_summary=Exists(summary_exists),
    )

    search = filters.get("search")
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search)
            | Q(location__icontains=search)
            | Q(notes__icontains=search)
        )

    event_type = filters.get("event_type")
    if event_type:
        queryset = queryset.filter(event_type=event_type)

    is_active = filters.get("is_active")
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    service_date_from = filters.get("service_date_from")
    if service_date_from:
        queryset = queryset.filter(service_date__gte=service_date_from)

    service_date_to = filters.get("service_date_to")
    if service_date_to:
        queryset = queryset.filter(service_date__lte=service_date_to)

    return queryset.order_by("-service_date", "start_time", "title", "id")


def get_service_event_by_id(*, service_event_id: int):
    return ServiceEvent.objects.filter(id=service_event_id).first()


def get_service_event_detail(*, service_event_id: int):
    return (
        ServiceEvent.objects.filter(id=service_event_id)
        .select_related("attendance_summary")
        .prefetch_related(
            Prefetch(
                "member_attendances",
                queryset=_ordered_member_attendance_queryset(),
            )
        )
        .first()
    )


def get_attendance_summary_for_event(*, service_event_id: int):
    return (
        AttendanceSummary.objects.select_related("service_event")
        .filter(service_event_id=service_event_id)
        .first()
    )


def list_member_attendance_for_event(*, service_event_id: int, filters: dict | None = None):
    filters = filters or {}
    filters["service_event_id"] = service_event_id
    return list_member_attendance(filters=filters)


def list_member_attendance(*, filters: dict | None = None):
    filters = filters or {}
    queryset = _ordered_member_attendance_queryset().select_related("service_event")

    search = filters.get("search")
    if search:
        queryset = queryset.filter(
            Q(member__first_name__icontains=search)
            | Q(member__middle_name__icontains=search)
            | Q(member__last_name__icontains=search)
            | Q(member__email__icontains=search)
            | Q(service_event__title__icontains=search)
        )

    service_event_id = filters.get("service_event_id")
    if service_event_id is not None:
        queryset = queryset.filter(service_event_id=service_event_id)

    member_id = filters.get("member_id")
    if member_id is not None:
        queryset = queryset.filter(member_id=member_id)

    status = filters.get("status")
    if status:
        queryset = queryset.filter(status=status)

    return queryset


def get_member_attendance_by_id(*, member_attendance_id: int, service_event_id: int | None = None):
    queryset = MemberAttendance.objects.select_related("member", "service_event").filter(
        id=member_attendance_id
    )
    if service_event_id is not None:
        queryset = queryset.filter(service_event_id=service_event_id)
    return queryset.first()
