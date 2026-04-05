from datetime import datetime

from rest_framework import serializers

from apps.common.serializers import PaginationQuerySerializer
from apps.attendance.models import (
    AttendanceSummary,
    MemberAttendance,
    ServiceEvent,
)

ATTENDANCE_PROGRESS_NOT_STARTED = "NOT_STARTED"
ATTENDANCE_PROGRESS_IN_PROGRESS = "IN_PROGRESS"
ATTENDANCE_PROGRESS_COMPLETED = "COMPLETED"


def _resolve_member_attendance_count(obj: ServiceEvent) -> int:
    annotated_count = getattr(obj, "member_attendance_count", None)
    if annotated_count is not None:
        return int(annotated_count)

    prefetched = getattr(obj, "_prefetched_objects_cache", {}).get("member_attendances")
    if prefetched is not None:
        return len(prefetched)

    return obj.member_attendances.count()


def _resolve_has_attendance_summary(obj: ServiceEvent) -> bool:
    annotated_flag = getattr(obj, "has_attendance_summary", None)
    if annotated_flag is not None:
        return bool(annotated_flag)

    try:
        return obj.attendance_summary is not None
    except AttendanceSummary.DoesNotExist:
        return False


def _resolve_progress_state(*, has_summary: bool, member_attendance_count: int) -> dict[str, object]:
    if has_summary and member_attendance_count > 0:
        return {
            "status": ATTENDANCE_PROGRESS_COMPLETED,
            "label": "Completed",
            "percent": 100,
            "is_complete": True,
        }

    if has_summary or member_attendance_count > 0:
        return {
            "status": ATTENDANCE_PROGRESS_IN_PROGRESS,
            "label": "In progress",
            "percent": 50,
            "is_complete": False,
        }

    return {
        "status": ATTENDANCE_PROGRESS_NOT_STARTED,
        "label": "Not started",
        "percent": 0,
        "is_complete": False,
    }


def _resolve_attendance_last_updated_at(obj: ServiceEvent):
    summary_timestamp = getattr(obj, "attendance_summary_updated_at", None)
    member_timestamp = getattr(obj, "member_attendance_last_updated_at", None)

    if summary_timestamp is None:
        try:
            summary = obj.attendance_summary
            summary_timestamp = summary.updated_at
        except AttendanceSummary.DoesNotExist:
            summary_timestamp = None

    if member_timestamp is None:
        prefetched_member_attendances = getattr(
            obj, "_prefetched_objects_cache", {}
        ).get("member_attendances")
        if prefetched_member_attendances is not None and prefetched_member_attendances:
            member_timestamp = max(
                member_attendance.updated_at
                for member_attendance in prefetched_member_attendances
            )
        elif prefetched_member_attendances is None:
            latest_member_attendance = obj.member_attendances.order_by("-updated_at").first()
            member_timestamp = (
                latest_member_attendance.updated_at if latest_member_attendance else None
            )

    candidates: list[datetime] = [
        candidate for candidate in [summary_timestamp, member_timestamp] if candidate is not None
    ]
    if not candidates:
        return None

    return max(candidates)


class ServiceEventListFilterSerializer(PaginationQuerySerializer):
    search = serializers.CharField(required=False, allow_blank=True)
    event_type = serializers.ChoiceField(
        choices=ServiceEvent._meta.get_field("event_type").choices,
        required=False,
    )
    is_active = serializers.BooleanField(required=False)
    service_date_from = serializers.DateField(required=False)
    service_date_to = serializers.DateField(required=False)

    def validate(self, attrs):
        service_date_from = attrs.get("service_date_from")
        service_date_to = attrs.get("service_date_to")
        if service_date_from and service_date_to and service_date_from > service_date_to:
            raise serializers.ValidationError(
                {"service_date_to": ["Service date end cannot be earlier than the start date."]}
            )
        return attrs


class MemberAttendanceListFilterSerializer(PaginationQuerySerializer):
    search = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(
        choices=MemberAttendance._meta.get_field("status").choices,
        required=False,
    )


class ServiceEventListSerializer(serializers.ModelSerializer):
    member_attendance_count = serializers.SerializerMethodField()
    has_attendance_summary = serializers.SerializerMethodField()
    attendance_progress_status = serializers.SerializerMethodField()
    attendance_progress_label = serializers.SerializerMethodField()
    attendance_progress_percent = serializers.SerializerMethodField()
    attendance_is_complete = serializers.SerializerMethodField()
    attendance_last_updated_at = serializers.SerializerMethodField()

    def get_member_attendance_count(self, obj):
        return _resolve_member_attendance_count(obj)

    def get_has_attendance_summary(self, obj):
        return _resolve_has_attendance_summary(obj)

    def _get_progress_state(self, obj):
        return _resolve_progress_state(
            has_summary=_resolve_has_attendance_summary(obj),
            member_attendance_count=_resolve_member_attendance_count(obj),
        )

    def get_attendance_progress_status(self, obj):
        return self._get_progress_state(obj)["status"]

    def get_attendance_progress_label(self, obj):
        return self._get_progress_state(obj)["label"]

    def get_attendance_progress_percent(self, obj):
        return self._get_progress_state(obj)["percent"]

    def get_attendance_is_complete(self, obj):
        return self._get_progress_state(obj)["is_complete"]

    def get_attendance_last_updated_at(self, obj):
        return _resolve_attendance_last_updated_at(obj)

    class Meta:
        model = ServiceEvent
        fields = [
            "id",
            "title",
            "event_type",
            "service_date",
            "start_time",
            "end_time",
            "location",
            "is_active",
            "member_attendance_count",
            "has_attendance_summary",
            "attendance_progress_status",
            "attendance_progress_label",
            "attendance_progress_percent",
            "attendance_is_complete",
            "attendance_last_updated_at",
        ]


class ServiceEventWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceEvent
        fields = [
            "title",
            "event_type",
            "service_date",
            "start_time",
            "end_time",
            "location",
            "notes",
            "is_active",
        ]


class AttendanceSummaryDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceSummary
        fields = [
            "id",
            "men_count",
            "women_count",
            "children_count",
            "visitor_count",
            "total_count",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("created_at", "updated_at")


class AttendanceSummaryWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceSummary
        fields = [
            "men_count",
            "women_count",
            "children_count",
            "visitor_count",
            "total_count",
            "notes",
        ]


class MemberAttendanceDetailSerializer(serializers.ModelSerializer):
    member_id = serializers.IntegerField(source="member.id", read_only=True)
    first_name = serializers.CharField(source="member.first_name", read_only=True)
    middle_name = serializers.CharField(source="member.middle_name", read_only=True)
    last_name = serializers.CharField(source="member.last_name", read_only=True)
    email = serializers.EmailField(source="member.email", read_only=True)

    class Meta:
        model = MemberAttendance
        fields = [
            "id",
            "member_id",
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "status",
            "checked_in_at",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("created_at", "updated_at")


class MemberAttendanceCreateSerializer(serializers.Serializer):
    member_id = serializers.IntegerField()
    status = serializers.ChoiceField(
        choices=MemberAttendance._meta.get_field("status").choices,
        default=MemberAttendance._meta.get_field("status").default,
    )
    checked_in_at = serializers.DateTimeField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class MemberAttendanceUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=MemberAttendance._meta.get_field("status").choices,
        required=False,
    )
    checked_in_at = serializers.DateTimeField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class ServiceEventDetailSerializer(serializers.ModelSerializer):
    attendance_summary = AttendanceSummaryDetailSerializer(read_only=True)
    member_attendances = MemberAttendanceDetailSerializer(many=True, read_only=True)
    member_attendance_count = serializers.SerializerMethodField()
    has_attendance_summary = serializers.SerializerMethodField()
    attendance_progress_status = serializers.SerializerMethodField()
    attendance_progress_label = serializers.SerializerMethodField()
    attendance_progress_percent = serializers.SerializerMethodField()
    attendance_is_complete = serializers.SerializerMethodField()
    attendance_last_updated_at = serializers.SerializerMethodField()

    def get_member_attendance_count(self, obj):
        return _resolve_member_attendance_count(obj)

    def get_has_attendance_summary(self, obj):
        return _resolve_has_attendance_summary(obj)

    def _get_progress_state(self, obj):
        return _resolve_progress_state(
            has_summary=_resolve_has_attendance_summary(obj),
            member_attendance_count=_resolve_member_attendance_count(obj),
        )

    def get_attendance_progress_status(self, obj):
        return self._get_progress_state(obj)["status"]

    def get_attendance_progress_label(self, obj):
        return self._get_progress_state(obj)["label"]

    def get_attendance_progress_percent(self, obj):
        return self._get_progress_state(obj)["percent"]

    def get_attendance_is_complete(self, obj):
        return self._get_progress_state(obj)["is_complete"]

    def get_attendance_last_updated_at(self, obj):
        return _resolve_attendance_last_updated_at(obj)

    class Meta:
        model = ServiceEvent
        fields = [
            "id",
            "title",
            "event_type",
            "service_date",
            "start_time",
            "end_time",
            "location",
            "notes",
            "is_active",
            "attendance_summary",
            "member_attendances",
            "member_attendance_count",
            "has_attendance_summary",
            "attendance_progress_status",
            "attendance_progress_label",
            "attendance_progress_percent",
            "attendance_is_complete",
            "attendance_last_updated_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("created_at", "updated_at")
