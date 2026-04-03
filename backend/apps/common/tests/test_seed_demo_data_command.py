from io import StringIO

from django.core.management import CommandError, call_command
from django.test import TestCase

from apps.attendance.models import AttendanceSummary, MemberAttendance, ServiceEvent
from apps.common.models import AuditEvent
from apps.finance.models import FundAccount, Transaction, TransactionLine
from apps.groups.models import Group, GroupMembership
from apps.households.models import Household, HouseholdMembership
from apps.members.models import Member
from apps.users.models import User


class SeedDemoDataCommandTests(TestCase):
    def test_seed_demo_data_populates_core_product_tables(self):
        stdout = StringIO()

        call_command("seed_demo_data", count=5, seed=20260330, stdout=stdout)

        self.assertGreaterEqual(User.objects.count(), 5)
        self.assertGreaterEqual(Member.objects.count(), 5)
        self.assertGreaterEqual(Household.objects.count(), 5)
        self.assertGreaterEqual(HouseholdMembership.objects.count(), 5)
        self.assertGreaterEqual(Group.objects.count(), 5)
        self.assertGreaterEqual(GroupMembership.objects.count(), 5)
        self.assertGreaterEqual(ServiceEvent.objects.count(), 5)
        self.assertGreaterEqual(AttendanceSummary.objects.count(), 5)
        self.assertGreaterEqual(MemberAttendance.objects.count(), 5)
        self.assertGreaterEqual(FundAccount.objects.count(), 5)
        self.assertGreaterEqual(Transaction.objects.count(), 5)
        self.assertGreaterEqual(TransactionLine.objects.count(), 5)
        self.assertGreaterEqual(AuditEvent.objects.count(), 5)

        active_memberships = HouseholdMembership.objects.filter(is_active=True)
        self.assertEqual(
            active_memberships.values("member_id").distinct().count(),
            active_memberships.count(),
        )

        output = stdout.getvalue()
        self.assertIn("Row counts:", output)
        self.assertIn("Demo data seeding complete.", output)

    def test_seed_demo_data_reset_replaces_seeded_domain_rows(self):
        call_command("seed_demo_data", count=5, seed=20260330)
        initial_member_count = Member.objects.count()
        initial_transaction_count = Transaction.objects.count()

        call_command("seed_demo_data", count=5, seed=20260331, reset=True)

        self.assertGreaterEqual(Member.objects.count(), 5)
        self.assertGreaterEqual(Transaction.objects.count(), 5)
        self.assertLessEqual(Member.objects.count(), initial_member_count + 2)
        self.assertLessEqual(Transaction.objects.count(), initial_transaction_count + 1)

    def test_seed_demo_data_validates_count_range(self):
        with self.assertRaises(CommandError):
            call_command("seed_demo_data", count=4)
        with self.assertRaises(CommandError):
            call_command("seed_demo_data", count=11)
