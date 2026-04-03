from django.db import models
from django.db.models import F, Q

from apps.common.models import AuditModel


class ServiceEventType(models.TextChoices):
    SUNDAY_SERVICE = "SUNDAY_SERVICE", "Sunday Service"
    MIDWEEK_SERVICE = "MIDWEEK_SERVICE", "Midweek Service"
    PRAYER_MEETING = "PRAYER_MEETING", "Prayer Meeting"
    YOUTH_MEETING = "YOUTH_MEETING", "Youth Meeting"
    CHOIR_REHEARSAL = "CHOIR_REHEARSAL", "Choir Rehearsal"
    SPECIAL_EVENT = "SPECIAL_EVENT", "Special Event"
    OTHER = "OTHER", "Other"


class AttendanceStatus(models.TextChoices):
    PRESENT = "PRESENT", "Present"
    ABSENT = "ABSENT", "Absent"
    LATE = "LATE", "Late"
    EXCUSED = "EXCUSED", "Excused"


class ServiceEvent(AuditModel):
    title = models.CharField(max_length=255)
    event_type = models.CharField(
        max_length=40,
        choices=ServiceEventType.choices,
        default=ServiceEventType.OTHER,
    )
    is_system_managed = models.BooleanField(default=False, db_index=True)
    service_date = models.DateField(db_index=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("-service_date", "start_time", "title", "id")
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(start_time__isnull=True)
                    | Q(end_time__isnull=True)
                    | Q(end_time__gte=F("start_time"))
                ),
                name="attendance_service_event_end_time_after_start_time",
            ),
            models.UniqueConstraint(
                fields=["service_date"],
                condition=Q(
                    event_type=ServiceEventType.SUNDAY_SERVICE,
                    is_system_managed=True,
                ),
                name="attendance_unique_system_sunday_service_per_date",
            ),
        ]

    def __str__(self):
        return f"{self.title} ({self.service_date})"


class AttendanceSummary(AuditModel):
    service_event = models.OneToOneField(
        "attendance.ServiceEvent",
        on_delete=models.CASCADE,
        related_name="attendance_summary",
    )
    men_count = models.PositiveIntegerField(default=0)
    women_count = models.PositiveIntegerField(default=0)
    children_count = models.PositiveIntegerField(default=0)
    visitor_count = models.PositiveIntegerField(default=0)
    total_count = models.PositiveIntegerField(default=0)
    notes = models.TextField(blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(men_count__gte=0)
                    & Q(women_count__gte=0)
                    & Q(children_count__gte=0)
                    & Q(visitor_count__gte=0)
                    & Q(total_count__gte=0)
                ),
                name="attendance_summary_counts_non_negative",
            ),
            models.CheckConstraint(
                condition=Q(
                    total_count=F("men_count") + F("women_count") + F("children_count")
                ),
                name="attendance_summary_total_matches_components",
            ),
            models.CheckConstraint(
                condition=Q(visitor_count__lte=F("total_count")),
                name="attendance_summary_visitor_count_within_total",
            ),
        ]

    def __str__(self):
        return f"Attendance summary for {self.service_event}"


class MemberAttendance(AuditModel):
    service_event = models.ForeignKey(
        "attendance.ServiceEvent",
        on_delete=models.CASCADE,
        related_name="member_attendances",
    )
    member = models.ForeignKey(
        "members.Member",
        on_delete=models.PROTECT,
        related_name="member_attendances",
    )
    status = models.CharField(
        max_length=20,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.PRESENT,
    )
    checked_in_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ("id",)
        constraints = [
            models.UniqueConstraint(
                fields=["service_event", "member"],
                name="unique_member_attendance_per_service_event_member",
            ),
        ]

    def __str__(self):
        return f"{self.member} - {self.service_event} ({self.status})"
