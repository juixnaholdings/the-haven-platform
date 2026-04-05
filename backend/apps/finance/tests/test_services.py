from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.exceptions import ValidationError

from apps.finance import selectors, services
from apps.finance.models import LedgerDirection, TransactionType

User = get_user_model()


class FinanceServiceTests(TestCase):
    def setUp(self):
        self.actor = User.objects.create_superuser(
            username="finance-service-admin",
            email="finance-service-admin@example.com",
            password="StrongPass123",
        )
        self.general_fund = services.create_fund_account(
            data={
                "name": "General Fund",
                "code": "gf",
                "description": "General operations",
                "is_active": True,
            },
            actor=self.actor,
        )
        self.welfare_fund = services.create_fund_account(
            data={
                "name": "Welfare Fund",
                "code": "wf",
                "description": "Welfare support",
                "is_active": True,
            },
            actor=self.actor,
        )

    def test_fund_account_creation(self):
        self.assertEqual(self.general_fund.code, "GF")
        self.assertEqual(self.general_fund.created_by, self.actor)

    def test_income_recording(self):
        transaction = services.record_income(
            fund_account=self.general_fund,
            amount=Decimal("150.00"),
            transaction_date=date(2026, 3, 22),
            description="Sunday offering",
            actor=self.actor,
        )

        self.assertEqual(transaction.transaction_type, TransactionType.INCOME)
        self.assertEqual(transaction.lines.count(), 1)
        self.assertEqual(transaction.lines.first().direction, LedgerDirection.IN)

    def test_expense_recording(self):
        transaction = services.record_expense(
            fund_account=self.general_fund,
            amount=Decimal("45.50"),
            transaction_date=date(2026, 3, 23),
            description="Sound equipment repair",
            actor=self.actor,
        )

        self.assertEqual(transaction.transaction_type, TransactionType.EXPENSE)
        self.assertEqual(transaction.lines.count(), 1)
        self.assertEqual(transaction.lines.first().direction, LedgerDirection.OUT)

    def test_transfer_recording(self):
        transaction = services.record_transfer(
            source_fund_account=self.general_fund,
            destination_fund_account=self.welfare_fund,
            amount=Decimal("25.00"),
            transaction_date=date(2026, 3, 24),
            description="Allocate welfare support",
            actor=self.actor,
        )

        self.assertEqual(transaction.transaction_type, TransactionType.TRANSFER)
        self.assertEqual(transaction.lines.count(), 2)
        directions = list(transaction.lines.values_list("direction", flat=True))
        self.assertCountEqual(directions, [LedgerDirection.OUT, LedgerDirection.IN])

    def test_transfer_from_same_source_target_fund_rejected(self):
        with self.assertRaises(ValidationError):
            services.record_transfer(
                source_fund_account=self.general_fund,
                destination_fund_account=self.general_fund,
                amount=Decimal("25.00"),
                transaction_date=date(2026, 3, 24),
                description="Invalid transfer",
                actor=self.actor,
            )

    def test_invalid_negative_amount_rejected(self):
        with self.assertRaises(ValidationError):
            services.record_income(
                fund_account=self.general_fund,
                amount=Decimal("-5.00"),
                transaction_date=date(2026, 3, 22),
                description="Invalid amount",
                actor=self.actor,
            )

    def test_balance_computation_works_from_posted_lines(self):
        services.record_income(
            fund_account=self.general_fund,
            amount=Decimal("100.00"),
            transaction_date=date(2026, 3, 22),
            description="Offering",
            actor=self.actor,
        )
        services.record_expense(
            fund_account=self.general_fund,
            amount=Decimal("35.00"),
            transaction_date=date(2026, 3, 23),
            description="Utilities",
            actor=self.actor,
        )
        services.record_transfer(
            source_fund_account=self.general_fund,
            destination_fund_account=self.welfare_fund,
            amount=Decimal("15.00"),
            transaction_date=date(2026, 3, 24),
            description="Transfer to welfare",
            actor=self.actor,
        )

        self.assertEqual(
            selectors.get_fund_account_balance(fund_account_id=self.general_fund.id),
            Decimal("50.00"),
        )
        self.assertEqual(
            selectors.get_fund_account_balance(fund_account_id=self.welfare_fund.id),
            Decimal("15.00"),
        )

    def test_update_transaction_metadata_updates_external_reference_and_line_metadata(self):
        transaction = services.record_income(
            fund_account=self.general_fund,
            amount=Decimal("90.00"),
            transaction_date=date(2026, 3, 25),
            description="Donation batch",
            category_name="Donation",
            notes="Original note",
            actor=self.actor,
        )
        line = transaction.lines.first()
        self.assertIsNotNone(line)

        updated = services.update_transaction_metadata(
            transaction=transaction,
            data={
                "external_reference": "BANK-REF-7781",
                "line_updates": [
                    {
                        "id": line.id,
                        "category_name": "Special donation",
                        "notes": "Corrected note",
                    }
                ],
            },
            actor=self.actor,
        )
        updated.refresh_from_db()
        line.refresh_from_db()

        self.assertEqual(updated.external_reference, "BANK-REF-7781")
        self.assertEqual(line.category_name, "Special donation")
        self.assertEqual(line.notes, "Corrected note")
