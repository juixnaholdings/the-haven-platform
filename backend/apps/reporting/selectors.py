from decimal import Decimal

from django.db.models import (
    Avg,
    Count,
    DecimalField,
    Exists,
    ExpressionWrapper,
    F,
    OuterRef,
    Q,
    Sum,
    Value,
)
from django.db.models.functions import Coalesce

from apps.attendance.models import AttendanceSummary, MemberAttendance, ServiceEvent
from apps.attendance.models import ServiceEventType
from apps.finance.models import FundAccount, LedgerDirection, Transaction, TransactionType
from apps.groups.models import Group, GroupMembership
from apps.households.models import Household
from apps.members.models import Member


DECIMAL_OUTPUT_FIELD = DecimalField(max_digits=14, decimal_places=2)
ZERO_DECIMAL = Value(Decimal("0.00"), output_field=DECIMAL_OUTPUT_FIELD)
SUNDAY_ATTENDANCE_RECORDED = "RECORDED"
SUNDAY_ATTENDANCE_IN_PROGRESS = "IN_PROGRESS"
SUNDAY_ATTENDANCE_NOT_STARTED = "NOT_STARTED"


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


def _get_sunday_attendance_state(*, has_attendance_summary: bool, member_attendance_count: int):
    if has_attendance_summary and member_attendance_count > 0:
        return SUNDAY_ATTENDANCE_RECORDED
    if has_attendance_summary or member_attendance_count > 0:
        return SUNDAY_ATTENDANCE_IN_PROGRESS
    return SUNDAY_ATTENDANCE_NOT_STARTED


def _serialize_sunday_service_snapshot(*, service_event):
    member_attendance_count = service_event.member_attendance_count or 0
    has_attendance_summary = bool(service_event.has_attendance_summary)
    return {
        "id": service_event.id,
        "title": service_event.title,
        "service_date": service_event.service_date,
        "is_active": service_event.is_active,
        "has_attendance_summary": has_attendance_summary,
        "member_attendance_count": member_attendance_count,
        "summary_total_count": service_event.summary_total_count or 0,
        "attendance_state": _get_sunday_attendance_state(
            has_attendance_summary=has_attendance_summary,
            member_attendance_count=member_attendance_count,
        ),
        "updated_at": service_event.updated_at,
    }


def _get_sunday_service_attendance_summary(*, service_events):
    summary_exists = AttendanceSummary.objects.filter(service_event_id=OuterRef("pk"))
    sunday_services = service_events.filter(
        event_type=ServiceEventType.SUNDAY_SERVICE,
        is_system_managed=True,
    ).annotate(
        has_attendance_summary=Exists(summary_exists),
        member_attendance_count=Count("member_attendances", distinct=True),
        summary_total_count=Coalesce(F("attendance_summary__total_count"), Value(0)),
    )

    total_services = sunday_services.count()
    with_summary = sunday_services.filter(has_attendance_summary=True).count()
    with_member_records = sunday_services.filter(member_attendance_count__gt=0).count()
    fully_recorded = sunday_services.filter(
        has_attendance_summary=True,
        member_attendance_count__gt=0,
    ).count()
    partially_recorded = sunday_services.filter(
        Q(has_attendance_summary=True, member_attendance_count=0)
        | Q(has_attendance_summary=False, member_attendance_count__gt=0)
    ).count()

    ordered_sunday_services = sunday_services.order_by("-service_date", "-start_time", "title", "id")
    latest_sunday_service = ordered_sunday_services.first()
    recent_sunday_services = [
        _serialize_sunday_service_snapshot(service_event=service_event)
        for service_event in ordered_sunday_services[:6]
    ]

    return {
        "total_services": total_services,
        "with_summary_count": with_summary,
        "with_member_records_count": with_member_records,
        "fully_recorded_count": fully_recorded,
        "partially_recorded_count": partially_recorded,
        "not_started_count": max(total_services - fully_recorded - partially_recorded, 0),
        "latest_service": (
            _serialize_sunday_service_snapshot(service_event=latest_sunday_service)
            if latest_sunday_service
            else None
        ),
        "recent_services": recent_sunday_services,
    }


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

    return {
        "total_groups": Group.objects.count(),
        "active_groups": Group.objects.filter(is_active=True).count(),
        "total_active_affiliations": GroupMembership.objects.filter(is_active=True).count(),
        "group_membership_counts": list(
            groups_with_counts.values("id", "name", "active_membership_count")
        ),
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
    sunday_summary = _get_sunday_service_attendance_summary(service_events=service_events)

    return {
        "total_events": service_events.count(),
        "aggregate_men_count": summary_totals["men_count"] or 0,
        "aggregate_women_count": summary_totals["women_count"] or 0,
        "aggregate_children_count": summary_totals["children_count"] or 0,
        "aggregate_visitor_count": summary_totals["visitor_count"] or 0,
        "aggregate_total_attendance": summary_totals["total_count"] or 0,
        "total_member_attendance_records": member_attendances.count(),
        "event_type_counts": list(
            service_events.values("event_type")
            .annotate(count=Count("id"))
            .order_by("event_type")
        ),
        "sunday_services": sunday_summary,
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

    return {
        "total_fund_accounts": FundAccount.objects.count(),
        "balances_by_fund": list(
            fund_balances.values("id", "name", "code", "current_balance")
        ),
        "total_income": total_income,
        "total_expense": total_expense,
        "total_transfers": total_transfers,
        "net_flow": total_income - total_expense,
    }


def get_dashboard_overview(*, filters: dict | None = None):
    return {
        "members": get_membership_summary(filters=filters),
        "households": get_household_summary(filters=filters),
        "groups": get_group_summary(filters=filters),
        "attendance": get_attendance_summary(filters=filters),
        "finance": get_finance_summary(filters=filters),
    }
