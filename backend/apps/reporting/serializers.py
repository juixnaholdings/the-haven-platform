from calendar import monthrange
from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers


class ReportingDateRangeSerializer(serializers.Serializer):
    date_preset = serializers.ChoiceField(
        required=False,
        choices=(
            ("TODAY", "Today"),
            ("THIS_WEEK", "This week"),
            ("THIS_MONTH", "This month"),
            ("CUSTOM", "Custom range"),
        ),
        help_text="Optional date preset for range-aware reporting endpoints.",
    )
    start_date = serializers.DateField(required=False, help_text="Inclusive report start date.")
    end_date = serializers.DateField(required=False, help_text="Inclusive report end date.")

    def validate(self, attrs):
        date_preset = attrs.get("date_preset")
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if date_preset == "TODAY":
            today = timezone.localdate()
            start_date = today
            end_date = today
        elif date_preset == "THIS_WEEK":
            today = timezone.localdate()
            start_date = today - timedelta(days=today.weekday())
            end_date = start_date + timedelta(days=6)
        elif date_preset == "THIS_MONTH":
            today = timezone.localdate()
            start_date = today.replace(day=1)
            end_date = today.replace(day=monthrange(today.year, today.month)[1])
        elif date_preset == "CUSTOM" and (not start_date or not end_date):
            raise serializers.ValidationError(
                {
                    "start_date": ["Start date is required for a custom date range preset."],
                    "end_date": ["End date is required for a custom date range preset."],
                }
            )

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                {"end_date": ["End date cannot be earlier than start date."]}
            )

        attrs["start_date"] = start_date
        attrs["end_date"] = end_date
        return attrs


class ReportingAppliedRangeSerializer(serializers.Serializer):
    date_preset = serializers.CharField(required=False, allow_null=True)
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)


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
    inactive_groups = serializers.IntegerField()
    total_active_affiliations = serializers.IntegerField()
    members_with_active_group = serializers.IntegerField()
    members_without_active_group = serializers.IntegerField()
    participation_rate_percent = serializers.FloatField()
    group_membership_counts = GroupMembershipCountSerializer(many=True)
    top_groups = GroupMembershipCountSerializer(many=True)


class AttendanceEventTypeCountSerializer(serializers.Serializer):
    event_type = serializers.CharField()
    count = serializers.IntegerField()


class AttendanceTrendPointSerializer(serializers.Serializer):
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    event_count = serializers.IntegerField()
    attendance_total = serializers.IntegerField()
    member_attendance_records = serializers.IntegerField()


class RecentAttendanceEventSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    event_type = serializers.CharField()
    service_date = serializers.DateField()
    total_attendance = serializers.IntegerField()
    member_attendance_count = serializers.IntegerField()


class AttendanceSummarySerializer(serializers.Serializer):
    total_events = serializers.IntegerField()
    events_with_summary = serializers.IntegerField()
    events_without_summary = serializers.IntegerField()
    aggregate_men_count = serializers.IntegerField()
    aggregate_women_count = serializers.IntegerField()
    aggregate_children_count = serializers.IntegerField()
    aggregate_visitor_count = serializers.IntegerField()
    aggregate_total_attendance = serializers.IntegerField()
    total_member_attendance_records = serializers.IntegerField()
    average_total_attendance_per_event = serializers.FloatField()
    attendance_capture_rate_percent = serializers.FloatField()
    event_type_counts = AttendanceEventTypeCountSerializer(many=True)
    attendance_trend = AttendanceTrendPointSerializer(many=True)
    recent_service_events = RecentAttendanceEventSerializer(many=True)
    applied_range = ReportingAppliedRangeSerializer()


class FundBalanceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    code = serializers.CharField()
    current_balance = serializers.DecimalField(max_digits=14, decimal_places=2)


class FinancePeriodSummarySerializer(serializers.Serializer):
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    total_income = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_expense = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_transfers = serializers.DecimalField(max_digits=14, decimal_places=2)
    net_flow = serializers.DecimalField(max_digits=14, decimal_places=2)


class FinanceCategoryTotalSerializer(serializers.Serializer):
    category_name = serializers.CharField()
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2)


class FinanceSummarySerializer(serializers.Serializer):
    total_fund_accounts = serializers.IntegerField()
    total_posted_transactions = serializers.IntegerField()
    balances_by_fund = FundBalanceSerializer(many=True)
    total_income = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_expense = serializers.DecimalField(max_digits=14, decimal_places=2)
    total_transfers = serializers.DecimalField(max_digits=14, decimal_places=2)
    net_flow = serializers.DecimalField(max_digits=14, decimal_places=2)
    period_breakdown = FinancePeriodSummarySerializer(many=True)
    top_categories = FinanceCategoryTotalSerializer(many=True)
    applied_range = ReportingAppliedRangeSerializer()


class DashboardOverviewSerializer(serializers.Serializer):
    members = MembershipSummarySerializer()
    households = HouseholdSummarySerializer()
    groups = GroupSummarySerializer()
    attendance = AttendanceSummarySerializer()
    finance = FinanceSummarySerializer()
