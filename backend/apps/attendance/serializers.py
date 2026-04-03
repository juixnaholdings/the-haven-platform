from rest_framework import serializers

from apps.common.serializers import PaginationQuerySerializer
from apps.attendance.models import (
    AttendanceSummary,
    MemberAttendance,
    ServiceEvent,
)


class ServiceEventListFilterSerializer(PaginationQuerySerializer):
    search = serializers.CharField(required=False, allow_blank=True)
    event_type = serializers.ChoiceField(
        choices=ServiceEvent._meta.get_field("event_type").choices,
        required=False,
    )
    is_system_managed = serializers.BooleanField(required=False)
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
    member_attendance_count = serializers.IntegerField(read_only=True)
    has_attendance_summary = serializers.BooleanField(read_only=True)

    class Meta:
        model = ServiceEvent
        fields = [
            "id",
            "title",
            "event_type",
            "is_system_managed",
            "service_date",
            "start_time",
            "end_time",
            "location",
            "is_active",
            "member_attendance_count",
            "has_attendance_summary",
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

    class Meta:
        model = ServiceEvent
        fields = [
            "id",
            "title",
            "event_type",
            "is_system_managed",
            "service_date",
            "start_time",
            "end_time",
            "location",
            "notes",
            "is_active",
            "attendance_summary",
            "member_attendances",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("created_at", "updated_at")
