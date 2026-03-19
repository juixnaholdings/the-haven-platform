from decimal import Decimal
from uuid import uuid4

from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.finance.models import (
    FundAccount,
    LedgerDirection,
    Transaction,
    TransactionLine,
    TransactionType,
)


def _set_audit_fields(instance, *, actor, is_create: bool = False) -> None:
    if not actor or not actor.is_authenticated:
        return

    if is_create and instance.created_by_id is None:
        instance.created_by = actor
    instance.updated_by = actor


def _normalize_code(code: str) -> str:
    return code.strip().upper()


def _validate_positive_amount(*, amount: Decimal) -> None:
    if amount <= 0:
        raise ValidationError({"amount": ["Amount must be greater than zero."]})


def _generate_reference_no() -> str:
    while True:
        candidate = f"FIN-{timezone.now():%Y%m%d%H%M%S}-{uuid4().hex[:6].upper()}"
        if not Transaction.objects.filter(reference_no=candidate).exists():
            return candidate


def _create_posted_transaction(
    *,
    transaction_type: str,
    transaction_date,
    description: str,
    service_event=None,
    line_specs: list[dict],
    actor=None,
) -> Transaction:
    if not line_specs:
        raise ValidationError({"lines": ["At least one transaction line is required."]})

    transaction = Transaction(
        reference_no=_generate_reference_no(),
        transaction_type=transaction_type,
        transaction_date=transaction_date,
        description=description,
        service_event=service_event,
        posted_at=timezone.now(),
    )
    _set_audit_fields(transaction, actor=actor, is_create=True)
    transaction.save()

    lines = []
    for line_spec in line_specs:
        line = TransactionLine(
            transaction=transaction,
            fund_account=line_spec["fund_account"],
            direction=line_spec["direction"],
            amount=line_spec["amount"],
            category_name=line_spec.get("category_name", ""),
            notes=line_spec.get("notes", ""),
        )
        _set_audit_fields(line, actor=actor, is_create=True)
        lines.append(line)

    TransactionLine.objects.bulk_create(lines)
    return transaction


@db_transaction.atomic
def create_fund_account(*, data: dict, actor=None) -> FundAccount:
    data = data.copy()
    data["code"] = _normalize_code(data["code"])

    fund_account = FundAccount(**data)
    _set_audit_fields(fund_account, actor=actor, is_create=True)
    fund_account.save()
    return fund_account


@db_transaction.atomic
def update_fund_account(*, fund_account: FundAccount, data: dict, actor=None) -> FundAccount:
    data = data.copy()
    if "code" in data:
        data["code"] = _normalize_code(data["code"])

    for field, value in data.items():
        setattr(fund_account, field, value)

    _set_audit_fields(fund_account, actor=actor)
    fund_account.save()
    return fund_account


@db_transaction.atomic
def record_income(
    *,
    fund_account: FundAccount,
    amount: Decimal,
    transaction_date,
    description: str,
    service_event=None,
    category_name: str = "",
    notes: str = "",
    actor=None,
) -> Transaction:
    _validate_positive_amount(amount=amount)

    return _create_posted_transaction(
        transaction_type=TransactionType.INCOME,
        transaction_date=transaction_date,
        description=description,
        service_event=service_event,
        line_specs=[
            {
                "fund_account": fund_account,
                "direction": LedgerDirection.IN,
                "amount": amount,
                "category_name": category_name,
                "notes": notes,
            }
        ],
        actor=actor,
    )


@db_transaction.atomic
def record_expense(
    *,
    fund_account: FundAccount,
    amount: Decimal,
    transaction_date,
    description: str,
    service_event=None,
    category_name: str = "",
    notes: str = "",
    actor=None,
) -> Transaction:
    _validate_positive_amount(amount=amount)

    return _create_posted_transaction(
        transaction_type=TransactionType.EXPENSE,
        transaction_date=transaction_date,
        description=description,
        service_event=service_event,
        line_specs=[
            {
                "fund_account": fund_account,
                "direction": LedgerDirection.OUT,
                "amount": amount,
                "category_name": category_name,
                "notes": notes,
            }
        ],
        actor=actor,
    )


@db_transaction.atomic
def record_transfer(
    *,
    source_fund_account: FundAccount,
    destination_fund_account: FundAccount,
    amount: Decimal,
    transaction_date,
    description: str,
    service_event=None,
    category_name: str = "",
    notes: str = "",
    actor=None,
) -> Transaction:
    _validate_positive_amount(amount=amount)

    if source_fund_account.id == destination_fund_account.id:
        raise ValidationError(
            {
                "destination_fund_account_id": [
                    "Transfer destination must be different from the source fund."
                ]
            }
        )

    return _create_posted_transaction(
        transaction_type=TransactionType.TRANSFER,
        transaction_date=transaction_date,
        description=description,
        service_event=service_event,
        line_specs=[
            {
                "fund_account": source_fund_account,
                "direction": LedgerDirection.OUT,
                "amount": amount,
                "category_name": category_name,
                "notes": notes,
            },
            {
                "fund_account": destination_fund_account,
                "direction": LedgerDirection.IN,
                "amount": amount,
                "category_name": category_name,
                "notes": notes,
            },
        ],
        actor=actor,
    )


@db_transaction.atomic
def update_transaction_metadata(*, transaction: Transaction, data: dict, actor=None) -> Transaction:
    for field in ("transaction_date", "description", "service_event"):
        if field in data:
            setattr(transaction, field, data[field])

    _set_audit_fields(transaction, actor=actor)
    transaction.save()
    return transaction
