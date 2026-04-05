from rest_framework import serializers

from apps.common.serializers import PaginationQuerySerializer
from apps.members.models import Member


class MemberListFilterSerializer(PaginationQuerySerializer):
    search = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    household_id = serializers.IntegerField(required=False, min_value=1)


class MemberListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Member
        fields = [
            "id",
            "first_name",
            "middle_name",
            "last_name",
            "full_name",
            "email",
            "phone_number",
            "is_active",
        ]


class MemberDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    active_household_membership = serializers.SerializerMethodField()
    household_memberships = serializers.SerializerMethodField()
    group_memberships = serializers.SerializerMethodField()
    attendance_summary = serializers.SerializerMethodField()
    recent_attendance_records = serializers.SerializerMethodField()

    class Meta:
        model = Member
        fields = [
            "id",
            "first_name",
            "middle_name",
            "last_name",
            "full_name",
            "email",
            "phone_number",
            "date_of_birth",
            "notes",
            "is_active",
            "active_household_membership",
            "household_memberships",
            "group_memberships",
            "attendance_summary",
            "recent_attendance_records",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("created_at", "updated_at")

    def get_active_household_membership(self, obj):
        household_memberships = self._get_prefetched_memberships(obj, "household_memberships")
        active_membership = next(
            (membership for membership in household_memberships if membership.is_active),
            None,
        )
        if active_membership is None:
            return None
        return MemberHouseholdMembershipSerializer(active_membership).data

    def get_household_memberships(self, obj):
        memberships = self._get_prefetched_memberships(obj, "household_memberships")
        return MemberHouseholdMembershipSerializer(memberships, many=True).data

    def get_group_memberships(self, obj):
        memberships = self._get_prefetched_memberships(obj, "group_memberships")
        return MemberGroupMembershipSerializer(memberships, many=True).data

    def get_attendance_summary(self, obj):
        return MemberAttendanceSummarySerializer(obj).data

    def get_recent_attendance_records(self, obj):
        prefetched_attendance = getattr(obj, "_prefetched_objects_cache", {}).get(
            "member_attendances"
        )
        attendance_records = prefetched_attendance if prefetched_attendance is not None else obj.member_attendances.select_related("service_event").order_by(
            "-service_event__service_date",
            "-updated_at",
            "-id",
        )
        return MemberRecentAttendanceSerializer(attendance_records[:8], many=True).data

    def _get_prefetched_memberships(self, obj, relation_name: str):
        prefetched = getattr(obj, "_prefetched_objects_cache", {}).get(relation_name)
        if prefetched is not None:
            return prefetched
        return getattr(obj, relation_name).all()


class MemberHouseholdMembershipSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    household_id = serializers.IntegerField(source="household.id", read_only=True)
    household_name = serializers.CharField(source="household.name", read_only=True)
    relationship_to_head = serializers.CharField(read_only=True)
    is_head = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    joined_on = serializers.DateField(read_only=True)
    left_on = serializers.DateField(read_only=True)
    notes = serializers.CharField(read_only=True)


class MemberGroupMembershipSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    group_id = serializers.IntegerField(source="group.id", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True)
    role_name = serializers.CharField(read_only=True)
    started_on = serializers.DateField(read_only=True)
    ended_on = serializers.DateField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    notes = serializers.CharField(read_only=True)


class MemberAttendanceSummarySerializer(serializers.Serializer):
    total_records = serializers.IntegerField(source="attendance_total_count", read_only=True)
    present_count = serializers.IntegerField(source="attendance_present_count", read_only=True)
    absent_count = serializers.IntegerField(source="attendance_absent_count", read_only=True)
    late_count = serializers.IntegerField(source="attendance_late_count", read_only=True)
    excused_count = serializers.IntegerField(source="attendance_excused_count", read_only=True)
    last_attended_on = serializers.DateField(
        source="attendance_last_attended_on",
        read_only=True,
        allow_null=True,
    )


class MemberRecentAttendanceSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    service_event_id = serializers.IntegerField(source="service_event.id", read_only=True)
    service_event_title = serializers.CharField(source="service_event.title", read_only=True)
    service_event_type = serializers.CharField(source="service_event.event_type", read_only=True)
    service_date = serializers.DateField(source="service_event.service_date", read_only=True)
    status = serializers.CharField(read_only=True)
    checked_in_at = serializers.DateTimeField(read_only=True, allow_null=True)
    updated_at = serializers.DateTimeField(read_only=True)


class MemberWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "phone_number",
            "date_of_birth",
            "notes",
            "is_active",
        ]
