from decimal import Decimal

from django.db.models import (
    Avg,
    Count,
    DecimalField,
    ExpressionWrapper,
    F,
    Q,
    Sum,
    Value,
)
from django.db.models.functions import Coalesce

from apps.attendance.models import AttendanceSummary, MemberAttendance, ServiceEvent
from apps.finance.models import FundAccount, LedgerDirection, Transaction, TransactionType
from apps.groups.models import Group, GroupMembership
from apps.households.models import Household
from apps.members.models import Member


DECIMAL_OUTPUT_FIELD = DecimalField(max_digits=14, decimal_places=2)
ZERO_DECIMAL = Value(Decimal("0.00"), output_field=DECIMAL_OUTPUT_FIELD)


def _build_applied_range(*, filters: dict | None = None):
    filters = filters or {}
    return {
        "date_preset": filters.get("date_preset"),
        "start_date": filters.get("start_date"),
        "end_date": filters.get("end_date"),
    }


def _apply_date_range(queryset, *, field_name: str, filters: dict | None = None):
    filters = filters or {}
    start_date = filters.get("start_date")
    end_date = filters.get("end_date")

    if start_date:
        queryset = queryset.filter(**{f"{field_name}__gte": start_date})
    if end_date:
        queryset = queryset.filter(**{f"{field_name}__lte": end_date})
    return queryset


def _annotate_fund_balances(*, end_date=None):
    balance_filter = Q(transaction_lines__transaction__posted_at__isnull=False)
    if end_date:
        balance_filter &= Q(transaction_lines__transaction__transaction_date__lte=end_date)

    return FundAccount.objects.annotate(
        total_in=Coalesce(
            Sum(
                "transaction_lines__amount",
                filter=balance_filter & Q(transaction_lines__direction=LedgerDirection.IN),
            ),
            ZERO_DECIMAL,
        ),
        total_out=Coalesce(
            Sum(
                "transaction_lines__amount",
                filter=balance_filter & Q(transaction_lines__direction=LedgerDirection.OUT),
            ),
            ZERO_DECIMAL,
        ),
    ).annotate(
        current_balance=ExpressionWrapper(
            F("total_in") - F("total_out"),
            output_field=DECIMAL_OUTPUT_FIELD,
        )
    )


def get_membership_summary(*, filters: dict | None = None):
    total_members = Member.objects.count()
    active_members = Member.objects.filter(is_active=True).count()

    return {
        "total_members": total_members,
        "active_members": active_members,
        "inactive_members": total_members - active_members,
    }


def get_household_summary(*, filters: dict | None = None):
    households_with_counts = Household.objects.annotate(
        active_member_count=Count(
            "memberships",
            filter=Q(memberships__is_active=True),
            distinct=True,
        )
    )
    average_household_size = households_with_counts.aggregate(
        average_household_size=Avg("active_member_count")
    )["average_household_size"] or 0

    return {
        "total_households": Household.objects.count(),
        "households_with_active_head": Household.objects.filter(
            memberships__is_active=True,
            memberships__is_head=True,
        )
        .distinct()
        .count(),
        "average_household_size": round(float(average_household_size), 2),
    }


def get_group_summary(*, filters: dict | None = None):
    groups_with_counts = Group.objects.annotate(
        active_membership_count=Count(
            "memberships",
            filter=Q(memberships__is_active=True),
            distinct=True,
        )
    )
    total_groups = Group.objects.count()
    active_groups = Group.objects.filter(is_active=True).count()
    members_with_active_group = (
        Member.objects.filter(group_memberships__is_active=True).distinct().count()
    )
    total_members = Member.objects.count()
    members_without_active_group = max(total_members - members_with_active_group, 0)
    participation_rate_percent = (
        round((members_with_active_group / total_members) * 100, 2)
        if total_members
        else 0.0
    )
    group_membership_counts = list(
        groups_with_counts.order_by("name").values("id", "name", "active_membership_count")
    )

    return {
        "total_groups": total_groups,
        "active_groups": active_groups,
        "inactive_groups": max(total_groups - active_groups, 0),
        "total_active_affiliations": GroupMembership.objects.filter(is_active=True).count(),
        "members_with_active_group": members_with_active_group,
        "members_without_active_group": members_without_active_group,
        "participation_rate_percent": participation_rate_percent,
        "group_membership_counts": group_membership_counts,
        "top_groups": group_membership_counts[:5],
    }


def get_attendance_summary(*, filters: dict | None = None):
    service_events = _apply_date_range(
        ServiceEvent.objects.all(),
        field_name="service_date",
        filters=filters,
    )
    attendance_summaries = _apply_date_range(
        AttendanceSummary.objects.all(),
        field_name="service_event__service_date",
        filters=filters,
    )
    member_attendances = _apply_date_range(
        MemberAttendance.objects.all(),
        field_name="service_event__service_date",
        filters=filters,
    )

    summary_totals = attendance_summaries.aggregate(
        men_count=Sum("men_count"),
        women_count=Sum("women_count"),
        children_count=Sum("children_count"),
        visitor_count=Sum("visitor_count"),
        total_count=Sum("total_count"),
    )
    total_events = service_events.count()
    events_with_summary = attendance_summaries.count()
    aggregate_total_attendance = summary_totals["total_count"] or 0
    total_member_attendance_records = member_attendances.count()

    event_counts_by_date = {
        row["service_date"]: row["event_count"]
        for row in service_events.values("service_date")
        .annotate(event_count=Count("id"))
        .order_by("service_date")
    }
    summary_totals_by_date = {
        row["service_event__service_date"]: row["attendance_total"]
        for row in attendance_summaries.values("service_event__service_date")
        .annotate(attendance_total=Coalesce(Sum("total_count"), Value(0)))
        .order_by("service_event__service_date")
    }
    member_records_by_date = {
        row["service_event__service_date"]: row["member_attendance_records"]
        for row in member_attendances.values("service_event__service_date")
        .annotate(member_attendance_records=Count("id"))
        .order_by("service_event__service_date")
    }
    trend_dates = sorted(
        {
            *event_counts_by_date.keys(),
            *summary_totals_by_date.keys(),
            *member_records_by_date.keys(),
        }
    )
    attendance_trend = [
        {
            "period_start": trend_date,
            "period_end": trend_date,
            "event_count": event_counts_by_date.get(trend_date, 0),
            "attendance_total": summary_totals_by_date.get(trend_date, 0),
            "member_attendance_records": member_records_by_date.get(trend_date, 0),
        }
        for trend_date in trend_dates
    ]
    recent_service_events = list(
        service_events.annotate(
            total_attendance=Coalesce(F("attendance_summary__total_count"), Value(0)),
            member_attendance_count=Count("member_attendances", distinct=True),
        )
        .order_by("-service_date", "-id")
        .values(
            "id",
            "title",
            "event_type",
            "service_date",
            "total_attendance",
            "member_attendance_count",
        )[:5]
    )

    return {
        "total_events": total_events,
        "events_with_summary": events_with_summary,
        "events_without_summary": max(total_events - events_with_summary, 0),
        "aggregate_men_count": summary_totals["men_count"] or 0,
        "aggregate_women_count": summary_totals["women_count"] or 0,
        "aggregate_children_count": summary_totals["children_count"] or 0,
        "aggregate_visitor_count": summary_totals["visitor_count"] or 0,
        "aggregate_total_attendance": aggregate_total_attendance,
        "total_member_attendance_records": total_member_attendance_records,
        "average_total_attendance_per_event": (
            round(aggregate_total_attendance / total_events, 2) if total_events else 0.0
        ),
        "attendance_capture_rate_percent": (
            round((events_with_summary / total_events) * 100, 2) if total_events else 0.0
        ),
        "event_type_counts": list(
            service_events.values("event_type")
            .annotate(count=Count("id"))
            .order_by("event_type")
        ),
        "attendance_trend": attendance_trend,
        "recent_service_events": recent_service_events,
        "applied_range": _build_applied_range(filters=filters),
    }


def get_finance_summary(*, filters: dict | None = None):
    filters = filters or {}
    posted_transactions = _apply_date_range(
        Transaction.objects.filter(posted_at__isnull=False),
        field_name="transaction_date",
        filters=filters,
    )
    fund_balances = _annotate_fund_balances(end_date=filters.get("end_date"))

    total_income = posted_transactions.filter(transaction_type=TransactionType.INCOME).aggregate(
        total=Sum("lines__amount", filter=Q(lines__direction=LedgerDirection.IN))
    )["total"] or Decimal("0.00")
    total_expense = posted_transactions.filter(
        transaction_type=TransactionType.EXPENSE
    ).aggregate(
        total=Sum("lines__amount", filter=Q(lines__direction=LedgerDirection.OUT))
    )["total"] or Decimal("0.00")
    total_transfers = posted_transactions.filter(
        transaction_type=TransactionType.TRANSFER
    ).aggregate(
        total=Sum("lines__amount", filter=Q(lines__direction=LedgerDirection.OUT))
    )["total"] or Decimal("0.00")
    period_breakdown = []
    for row in posted_transactions.values("transaction_date").annotate(
        total_income=Coalesce(
            Sum(
                "lines__amount",
                filter=Q(
                    transaction_type=TransactionType.INCOME,
                    lines__direction=LedgerDirection.IN,
                ),
            ),
            ZERO_DECIMAL,
        ),
        total_expense=Coalesce(
            Sum(
                "lines__amount",
                filter=Q(
                    transaction_type=TransactionType.EXPENSE,
                    lines__direction=LedgerDirection.OUT,
                ),
            ),
            ZERO_DECIMAL,
        ),
        total_transfers=Coalesce(
            Sum(
                "lines__amount",
                filter=Q(
                    transaction_type=TransactionType.TRANSFER,
                    lines__direction=LedgerDirection.OUT,
                ),
            ),
            ZERO_DECIMAL,
        ),
    ).order_by("transaction_date"):
        period_breakdown.append(
            {
                "period_start": row["transaction_date"],
                "period_end": row["transaction_date"],
                "total_income": row["total_income"],
                "total_expense": row["total_expense"],
                "total_transfers": row["total_transfers"],
                "net_flow": row["total_income"] - row["total_expense"],
            }
        )

    top_categories = list(
        posted_transactions.filter(lines__category_name__gt="")
        .values("lines__category_name")
        .annotate(total_amount=Coalesce(Sum("lines__amount"), ZERO_DECIMAL))
        .order_by("-total_amount", "lines__category_name")[:5]
    )
    top_categories = [
        {
            "category_name": row["lines__category_name"],
            "total_amount": row["total_amount"],
        }
        for row in top_categories
    ]

    return {
        "total_fund_accounts": FundAccount.objects.count(),
        "total_posted_transactions": posted_transactions.count(),
        "balances_by_fund": list(
            fund_balances.values("id", "name", "code", "current_balance")
        ),
        "total_income": total_income,
        "total_expense": total_expense,
        "total_transfers": total_transfers,
        "net_flow": total_income - total_expense,
        "period_breakdown": period_breakdown,
        "top_categories": top_categories,
        "applied_range": _build_applied_range(filters=filters),
    }


def get_dashboard_overview(*, filters: dict | None = None):
    return {
        "members": get_membership_summary(filters=filters),
        "households": get_household_summary(filters=filters),
        "groups": get_group_summary(filters=filters),
        "attendance": get_attendance_summary(filters=filters),
        "finance": get_finance_summary(filters=filters),
    }
