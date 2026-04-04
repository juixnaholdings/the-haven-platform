from django.db.models import Count, Max, Prefetch, Q

from apps.attendance.models import AttendanceStatus, MemberAttendance
from apps.groups.models import GroupMembership
from apps.households.models import HouseholdMembership
from apps.members.models import Member


def _ordered_household_membership_queryset():
    return HouseholdMembership.objects.select_related("household").order_by(
        "-is_active",
        "-is_head",
        "-joined_on",
        "household__name",
        "id",
    )


def _ordered_group_membership_queryset():
    return GroupMembership.objects.select_related("group").order_by(
        "-is_active",
        "group__name",
        "-started_on",
        "id",
    )


def _ordered_member_attendance_queryset():
    return MemberAttendance.objects.select_related("service_event").order_by(
        "-service_event__service_date",
        "-updated_at",
        "-id",
    )


def list_members(*, filters: dict | None = None):
    filters = filters or {}
    queryset = Member.objects.all()

    search = filters.get("search")
    if search:
        queryset = queryset.filter(
            Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(middle_name__icontains=search)
            | Q(email__icontains=search)
            | Q(phone_number__icontains=search)
        )

    is_active = filters.get("is_active")
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    household_id = filters.get("household_id")
    if household_id is not None:
        queryset = queryset.filter(
            household_memberships__household_id=household_id,
            household_memberships__is_active=True,
        )

    return queryset.order_by("last_name", "first_name", "id").distinct()


def get_member_by_id(*, member_id: int):
    return (
        Member.objects.filter(id=member_id)
        .annotate(
            attendance_total_count=Count("member_attendances", distinct=True),
            attendance_present_count=Count(
                "member_attendances",
                filter=Q(member_attendances__status=AttendanceStatus.PRESENT),
                distinct=True,
            ),
            attendance_absent_count=Count(
                "member_attendances",
                filter=Q(member_attendances__status=AttendanceStatus.ABSENT),
                distinct=True,
            ),
            attendance_late_count=Count(
                "member_attendances",
                filter=Q(member_attendances__status=AttendanceStatus.LATE),
                distinct=True,
            ),
            attendance_excused_count=Count(
                "member_attendances",
                filter=Q(member_attendances__status=AttendanceStatus.EXCUSED),
                distinct=True,
            ),
            attendance_last_attended_on=Max("member_attendances__service_event__service_date"),
        )
        .prefetch_related(
            Prefetch("household_memberships", queryset=_ordered_household_membership_queryset()),
            Prefetch("group_memberships", queryset=_ordered_group_membership_queryset()),
            Prefetch("member_attendances", queryset=_ordered_member_attendance_queryset()),
        )
        .first()
    )
