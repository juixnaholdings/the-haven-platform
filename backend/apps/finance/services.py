from decimal import Decimal
from uuid import uuid4

from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.common.audit import AuditEventType, AuditTargetType
from apps.common import services as common_services
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
    external_reference: str = "",
    service_event=None,
    line_specs: list[dict],
    actor=None,
) -> Transaction:
    if not line_specs:
        raise ValidationError({"lines": ["At least one transaction line is required."]})

    transaction = Transaction(
        reference_no=_generate_reference_no(),
        external_reference=external_reference,
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

    total_in = sum(
        (line_spec["amount"] for line_spec in line_specs if line_spec["direction"] == LedgerDirection.IN),
        Decimal("0"),
    )
    total_out = sum(
        (line_spec["amount"] for line_spec in line_specs if line_spec["direction"] == LedgerDirection.OUT),
        Decimal("0"),
    )
    common_services.log_audit_event(
        actor=actor,
        event_type=AuditEventType.FINANCE_TRANSACTION_CREATED,
        target_type=AuditTargetType.FINANCE_TRANSACTION,
        target_id=transaction.id,
        summary=(
            f"Recorded {transaction.get_transaction_type_display().lower()} transaction "
            f"'{transaction.reference_no}'."
        ),
        payload={
            "reference_no": transaction.reference_no,
            "external_reference": transaction.external_reference,
            "transaction_type": transaction.transaction_type,
            "transaction_date": str(transaction.transaction_date),
            "service_event_id": transaction.service_event_id,
            "line_count": len(line_specs),
            "total_in_amount": str(total_in),
            "total_out_amount": str(total_out),
        },
    )
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
    external_reference: str = "",
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
        external_reference=external_reference,
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
    external_reference: str = "",
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
        external_reference=external_reference,
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
    external_reference: str = "",
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
        external_reference=external_reference,
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
    line_updates = data.pop("line_updates", [])
    changed_fields = []
    for field in ("transaction_date", "description", "external_reference", "service_event"):
        if field in data:
            incoming_value = data[field]
            if getattr(transaction, field) != incoming_value:
                setattr(transaction, field, incoming_value)
                changed_fields.append(field)
    changed_fields.sort()

    line_changes = []
    if line_updates:
        existing_lines = {
            line.id: line for line in TransactionLine.objects.filter(transaction=transaction)
        }
        for update in line_updates:
            line = existing_lines.get(update["id"])
            if line is None:
                raise ValidationError(
                    {
                        "line_updates": [
                            f"Line id '{update['id']}' does not belong to transaction '{transaction.reference_no}'."
                        ]
                    }
                )

            line_changed_fields = []
            if "category_name" in update and line.category_name != update["category_name"]:
                line.category_name = update["category_name"]
                line_changed_fields.append("category_name")
            if "notes" in update and line.notes != update["notes"]:
                line.notes = update["notes"]
                line_changed_fields.append("notes")

            if line_changed_fields:
                _set_audit_fields(line, actor=actor)
                line.save(update_fields=[*line_changed_fields, "updated_by", "updated_at"])
                line_changes.append(
                    {
                        "line_id": line.id,
                        "changed_fields": line_changed_fields,
                    }
                )

    if changed_fields:
        _set_audit_fields(transaction, actor=actor)
        transaction.save()

    if not changed_fields and not line_changes:
        return transaction

    common_services.log_audit_event(
        actor=actor,
        event_type=AuditEventType.FINANCE_TRANSACTION_UPDATED,
        target_type=AuditTargetType.FINANCE_TRANSACTION,
        target_id=transaction.id,
        summary=f"Updated transaction metadata for '{transaction.reference_no}'.",
        payload={
            "reference_no": transaction.reference_no,
            "changed_fields": changed_fields,
            "line_changes": line_changes,
            "transaction_date": str(transaction.transaction_date),
            "external_reference": transaction.external_reference,
            "service_event_id": transaction.service_event_id,
        },
    )
    return transaction
