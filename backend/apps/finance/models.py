from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.common.models import AuditModel


class TransactionType(models.TextChoices):
    INCOME = "INCOME", "Income"
    EXPENSE = "EXPENSE", "Expense"
    TRANSFER = "TRANSFER", "Transfer"


class LedgerDirection(models.TextChoices):
    IN = "IN", "In"
    OUT = "OUT", "Out"


class FundAccount(AuditModel):
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=32, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("name", "id")

    def __str__(self):
        return f"{self.name} ({self.code})"


class Transaction(AuditModel):
    reference_no = models.CharField(max_length=40, unique=True)
    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
    )
    transaction_date = models.DateField(db_index=True)
    description = models.TextField()
    service_event = models.ForeignKey(
        "attendance.ServiceEvent",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="finance_transactions",
    )
    posted_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ("-transaction_date", "-posted_at", "-id")

    def __str__(self):
        return self.reference_no


class TransactionLine(AuditModel):
    transaction = models.ForeignKey(
        "finance.Transaction",
        on_delete=models.CASCADE,
        related_name="lines",
    )
    fund_account = models.ForeignKey(
        "finance.FundAccount",
        on_delete=models.PROTECT,
        related_name="transaction_lines",
    )
    direction = models.CharField(
        max_length=8,
        choices=LedgerDirection.choices,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category_name = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ("id",)
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0),
                name="finance_transaction_line_amount_gt_zero",
            ),
        ]

    def __str__(self):
        return f"{self.transaction.reference_no} - {self.fund_account.code} {self.direction}"
