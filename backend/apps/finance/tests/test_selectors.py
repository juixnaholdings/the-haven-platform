from datetime import date
from decimal import Decimal

from django.test import TestCase

from apps.finance import selectors, services


class FinanceSelectorTests(TestCase):
    def setUp(self):
        self.general_fund = services.create_fund_account(
            data={
                "name": "General Fund",
                "code": "GF",
                "description": "General operations",
                "is_active": True,
            }
        )
        self.welfare_fund = services.create_fund_account(
            data={
                "name": "Welfare Fund",
                "code": "WF",
                "description": "Welfare support",
                "is_active": True,
            }
        )
        services.record_income(
            fund_account=self.general_fund,
            amount=Decimal("120.00"),
            transaction_date=date(2026, 3, 22),
            description="Sunday offering",
        )
        self.transfer = services.record_transfer(
            source_fund_account=self.general_fund,
            destination_fund_account=self.welfare_fund,
            amount=Decimal("20.00"),
            transaction_date=date(2026, 3, 23),
            description="Transfer to welfare",
        )

    def test_list_fund_accounts_returns_computed_balances(self):
        fund_accounts = selectors.list_fund_accounts(filters={"search": "General"})

        self.assertEqual(fund_accounts.count(), 1)
        self.assertEqual(fund_accounts.first().current_balance, Decimal("100.00"))

    def test_get_transaction_detail_includes_lines(self):
        transaction = selectors.get_transaction_detail(transaction_id=self.transfer.id)

        self.assertEqual(transaction.lines.count(), 2)
        self.assertEqual(transaction.total_in_amount, Decimal("20.00"))
        self.assertEqual(transaction.total_out_amount, Decimal("20.00"))
