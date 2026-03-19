from decimal import Decimal

from django.db.models import Count, DecimalField, ExpressionWrapper, F, Prefetch, Q, Sum, Value
from django.db.models.functions import Coalesce

from apps.finance.models import FundAccount, LedgerDirection, Transaction, TransactionLine


BALANCE_OUTPUT_FIELD = DecimalField(max_digits=14, decimal_places=2)
ZERO_BALANCE = Value(Decimal("0.00"), output_field=BALANCE_OUTPUT_FIELD)


def _annotate_fund_account_balances(queryset):
    return queryset.annotate(
        total_in=Coalesce(
            Sum(
                "transaction_lines__amount",
                filter=Q(
                    transaction_lines__transaction__posted_at__isnull=False,
                    transaction_lines__direction=LedgerDirection.IN,
                ),
            ),
            ZERO_BALANCE,
        ),
        total_out=Coalesce(
            Sum(
                "transaction_lines__amount",
                filter=Q(
                    transaction_lines__transaction__posted_at__isnull=False,
                    transaction_lines__direction=LedgerDirection.OUT,
                ),
            ),
            ZERO_BALANCE,
        ),
    ).annotate(
        current_balance=ExpressionWrapper(
            F("total_in") - F("total_out"),
            output_field=BALANCE_OUTPUT_FIELD,
        )
    )


def _annotate_transaction_totals(queryset):
    return queryset.annotate(
        line_count=Count("lines", distinct=True),
        total_in_amount=Coalesce(
            Sum(
                "lines__amount",
                filter=Q(
                    posted_at__isnull=False,
                    lines__direction=LedgerDirection.IN,
                ),
            ),
            ZERO_BALANCE,
        ),
        total_out_amount=Coalesce(
            Sum(
                "lines__amount",
                filter=Q(
                    posted_at__isnull=False,
                    lines__direction=LedgerDirection.OUT,
                ),
            ),
            ZERO_BALANCE,
        ),
    )


def _ordered_transaction_lines_queryset():
    return TransactionLine.objects.select_related("fund_account").order_by("id")


def list_fund_accounts(*, filters: dict | None = None):
    filters = filters or {}
    queryset = _annotate_fund_account_balances(FundAccount.objects.all())

    search = filters.get("search")
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(code__icontains=search)
            | Q(description__icontains=search)
        )

    is_active = filters.get("is_active")
    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    return queryset


def get_fund_account_by_id(*, fund_account_id: int):
    return _annotate_fund_account_balances(
        FundAccount.objects.filter(id=fund_account_id)
    ).first()


def get_fund_account_balance(*, fund_account_id: int):
    fund_account = get_fund_account_by_id(fund_account_id=fund_account_id)
    if fund_account is None:
        return None
    return fund_account.current_balance


def list_transactions(*, filters: dict | None = None):
    filters = filters or {}
    queryset = _annotate_transaction_totals(
        Transaction.objects.select_related("service_event")
    )

    search = filters.get("search")
    if search:
        queryset = queryset.filter(
            Q(reference_no__icontains=search)
            | Q(description__icontains=search)
            | Q(lines__category_name__icontains=search)
            | Q(lines__fund_account__name__icontains=search)
            | Q(lines__fund_account__code__icontains=search)
            | Q(service_event__title__icontains=search)
        )

    transaction_type = filters.get("transaction_type")
    if transaction_type:
        queryset = queryset.filter(transaction_type=transaction_type)

    fund_account_id = filters.get("fund_account_id")
    if fund_account_id is not None:
        queryset = queryset.filter(lines__fund_account_id=fund_account_id)

    service_event_id = filters.get("service_event_id")
    if service_event_id is not None:
        queryset = queryset.filter(service_event_id=service_event_id)

    transaction_date_from = filters.get("transaction_date_from")
    if transaction_date_from:
        queryset = queryset.filter(transaction_date__gte=transaction_date_from)

    transaction_date_to = filters.get("transaction_date_to")
    if transaction_date_to:
        queryset = queryset.filter(transaction_date__lte=transaction_date_to)

    return queryset.distinct()


def get_transaction_by_id(*, transaction_id: int):
    return _annotate_transaction_totals(
        Transaction.objects.select_related("service_event").filter(id=transaction_id)
    ).first()


def get_transaction_detail(*, transaction_id: int):
    return (
        _annotate_transaction_totals(
            Transaction.objects.select_related("service_event").filter(id=transaction_id)
        )
        .prefetch_related(
            Prefetch("lines", queryset=_ordered_transaction_lines_queryset())
        )
        .first()
    )
