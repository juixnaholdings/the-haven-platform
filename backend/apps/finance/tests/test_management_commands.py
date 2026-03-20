from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from apps.finance.management.commands.seed_fund_accounts import BASELINE_FUND_ACCOUNTS
from apps.finance.models import FundAccount


class SeedFundAccountsCommandTests(TestCase):
    def test_seed_fund_accounts_creates_expected_defaults(self):
        stdout = StringIO()

        call_command("seed_fund_accounts", stdout=stdout)

        self.assertEqual(FundAccount.objects.count(), len(BASELINE_FUND_ACCOUNTS))
        self.assertCountEqual(
            FundAccount.objects.values_list("code", flat=True),
            [item["code"] for item in BASELINE_FUND_ACCOUNTS],
        )
        self.assertIn("Summary:", stdout.getvalue())
        self.assertIn("- Created: 4", stdout.getvalue())

    def test_seed_fund_accounts_is_idempotent(self):
        call_command("seed_fund_accounts")
        stdout = StringIO()

        call_command("seed_fund_accounts", stdout=stdout)

        self.assertEqual(FundAccount.objects.count(), len(BASELINE_FUND_ACCOUNTS))
        self.assertIn("- Created: 0", stdout.getvalue())
        self.assertIn("- Updated: 0", stdout.getvalue())

    def test_seed_fund_accounts_updates_existing_record_by_code(self):
        FundAccount.objects.create(
            name="Legacy General Fund",
            code="GF",
            description="Outdated description",
            is_active=False,
        )

        stdout = StringIO()
        call_command("seed_fund_accounts", stdout=stdout)

        general_fund = FundAccount.objects.get(code="GF")
        self.assertEqual(general_fund.name, "General Fund")
        self.assertTrue(general_fund.is_active)
        self.assertIn("- Updated: 1", stdout.getvalue())
