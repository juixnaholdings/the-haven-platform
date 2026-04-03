from rest_framework import serializers


class ReportingDateRangeSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False, help_text="Inclusive report start date.")
    end_date = serializers.DateField(required=False, help_text="Inclusive report end date.")

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                {"end_date": ["End date cannot be earlier than start date."]}
            )
        return attrs


class MembershipSummarySerializer(serializers.Serializer):
    total_members = serializers.IntegerField()
    active_members = serializers.IntegerField()
    inactive_members = serializers.IntegerField()


class HouseholdSummarySerializer(serializers.Serializer):
    total_households = serializers.IntegerField()
    households_with_active_head = serializers.IntegerField()
    average_household_size = serializers.FloatField()


class GroupMembershipCountSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    active_membership_count = serializers.IntegerField()


class GroupSummarySerializer(serializers.Serializer):
    total_groups = serializers.IntegerField()
    active_groups = serializers.IntegerField()
    total_active_affiliations = serializers.IntegerField()
    group_membership_counts = GroupMembershipCountSerializer(many=True)


class AttendanceEventTypeCountSerializer(serializers.Serializer):
    event_type = serializers.CharField()
    count = serializers.IntegerField()


class SundayServiceSnapshotSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    service_date = serializers.DateField()
    is_active = serializers.BooleanField()
    has_attendance_summary = serializers.BooleanField()
    member_attendance_count = serializers.IntegerField()
    summary_total_count = serializers.IntegerField()
    attendance_state = serializers.CharField()
    updated_at = serializers.DateTimeField()


class SundayServiceSummarySerializer(serializers.Serializer):
    total_services = serializers.IntegerField()
    with_summary_count = serializers.IntegerField()
    with_member_records_count = serializers.IntegerField()
    fully_recorded_count = serializers.IntegerField()
    partially_recorded_count = serializers.IntegerField()
    not_started_count = serializers.IntegerField()
    latest_service = SundayServiceSnapshotSerializer(allow_null=True)
    recent_services = SundayServiceSnapshotSerializer(many=True)


class AttendanceSummarySerializer(serializers.Serializer):
    total_events = serializers.IntegerField()
    aggregate_men_count = serializers.IntegerField()
    aggregate_women_count = serializers.IntegerField()
    aggregate_children_count = serializers.IntegerField()
    aggregate_visitor_count = serializers.IntegerField()
    aggregate_total_attendance = serializers.IntegerField()
    total_member_attendance_records = serializers.IntegerField()
    event_type_counts = AttendanceEventTypeCountSerializer(many=True)
    sunday_services = SundayServiceSummarySerializer()


class FundBalanceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    code = serializers.CharField()
    current_balance = serializers.DecimalField(max_digits=14, decimal_places=2)


class FinanceSummarySerializer(serializers.Serializer):
    total_fund_accounts = serializers.IntegerField()
    balances_by_fund = FundBalanceSerializer(many=True)
    total_income = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_expense = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_transfers = serializers.DecimalField(max_digits=14, decimal_places=2)
    net_flow = serializers.DecimalField(max_digits=14, decimal_places=2)


class DashboardOverviewSerializer(serializers.Serializer):
    members = MembershipSummarySerializer()
    households = HouseholdSummarySerializer()
    groups = GroupSummarySerializer()
    attendance = AttendanceSummarySerializer()
    finance = FinanceSummarySerializer()
