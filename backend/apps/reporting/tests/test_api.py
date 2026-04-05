from datetime import date
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from rest_framework import status
from rest_framework.test import APITestCase

from apps.attendance import services as attendance_services
from apps.attendance.models import ServiceEventType
from apps.finance import services as finance_services
from apps.groups import services as group_services
from apps.households import services as household_services
from apps.households.models import HouseholdRelationship
from apps.members.models import Member
from apps.users.constants import FINANCE_SECRETARY_ROLE, MEMBERSHIP_SECRETARY_ROLE

User = get_user_model()


class ReportingAdminApiTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username="reporting-admin",
            email="reporting-admin@example.com",
            password="StrongPass123",
        )
        self.client.force_authenticate(self.admin_user)

        self.member_1 = Member.objects.create(first_name="Ama", last_name="Mensah", is_active=True)
        self.member_2 = Member.objects.create(first_name="Kojo", last_name="Boateng", is_active=True)
        self.member_3 = Member.objects.create(first_name="Efua", last_name="Owusu", is_active=False)

        household_1 = household_services.create_household(
            data={"name": "Mensah Household", "is_active": True}
        )
        household_2 = household_services.create_household(
            data={"name": "Boateng Household", "is_active": True}
        )
        household_services.add_member_to_household(
            household=household_1,
            member=self.member_1,
            relationship_to_head=HouseholdRelationship.HEAD,
            is_head=True,
        )
        household_services.add_member_to_household(
            household=household_1,
            member=self.member_2,
            relationship_to_head=HouseholdRelationship.SPOUSE,
        )
        household_services.add_member_to_household(
            household=household_2,
            member=self.member_3,
            relationship_to_head=HouseholdRelationship.OTHER,
        )

        group_1 = group_services.create_group(
            data={"name": "Choir", "description": "", "is_active": True}
        )
        group_2 = group_services.create_group(
            data={"name": "Youth Ministry", "description": "", "is_active": False}
        )
        group_services.add_member_to_group(group=group_1, member=self.member_1, role_name="Lead")
        group_services.add_member_to_group(group=group_2, member=self.member_3, role_name="Member")

        march_event = attendance_services.create_service_event(
            data={
                "title": "Sunday Morning Service",
                "event_type": ServiceEventType.SUNDAY_SERVICE,
                "service_date": date(2026, 3, 22),
                "location": "Main Auditorium",
                "is_active": True,
            }
        )
        february_event = attendance_services.create_service_event(
            data={
                "title": "Prayer Meeting",
                "event_type": ServiceEventType.PRAYER_MEETING,
                "service_date": date(2026, 2, 18),
                "location": "Chapel",
                "is_active": True,
            }
        )
        attendance_services.create_or_update_attendance_summary(
            service_event=march_event,
            data={
                "men_count": 10,
                "women_count": 12,
                "children_count": 8,
                "visitor_count": 4,
                "total_count": 30,
            },
        )
        attendance_services.create_or_update_attendance_summary(
            service_event=february_event,
            data={
                "men_count": 6,
                "women_count": 7,
                "children_count": 5,
                "visitor_count": 2,
                "total_count": 18,
            },
        )
        attendance_services.record_member_attendance(
            service_event=march_event,
            member=self.member_1,
            status="PRESENT",
        )
        attendance_services.record_member_attendance(
            service_event=march_event,
            member=self.member_2,
            status="LATE",
        )
        attendance_services.record_member_attendance(
            service_event=february_event,
            member=self.member_3,
            status="ABSENT",
        )

        general_fund = finance_services.create_fund_account(
            data={
                "name": "General Fund",
                "code": "GF",
                "description": "General operations",
                "is_active": True,
            }
        )
        welfare_fund = finance_services.create_fund_account(
            data={
                "name": "Welfare Fund",
                "code": "WF",
                "description": "Welfare support",
                "is_active": True,
            }
        )
        finance_services.record_income(
            fund_account=general_fund,
            amount=Decimal("50.00"),
            transaction_date=date(2026, 2, 10),
            description="Earlier donation",
        )
        finance_services.record_income(
            fund_account=general_fund,
            amount=Decimal("100.00"),
            transaction_date=date(2026, 3, 22),
            description="March offering",
            service_event=march_event,
        )
        finance_services.record_expense(
            fund_account=general_fund,
            amount=Decimal("30.00"),
            transaction_date=date(2026, 3, 23),
            description="Utilities",
        )
        finance_services.record_transfer(
            source_fund_account=general_fund,
            destination_fund_account=welfare_fund,
            amount=Decimal("20.00"),
            transaction_date=date(2026, 3, 24),
            description="Support welfare",
        )

    def test_dashboard_overview_endpoint_success(self):
        response = self.client.get(
            "/api/reports/dashboard/?date_preset=CUSTOM&start_date=2026-03-01&end_date=2026-03-31"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["members"]["total_members"], 3)
        self.assertEqual(response.data["data"]["attendance"]["total_events"], 1)
        self.assertEqual(response.data["data"]["attendance"]["applied_range"]["date_preset"], "CUSTOM")
        self.assertEqual(response.data["data"]["finance"]["total_income"], "100.00")
        self.assertEqual(response.data["data"]["finance"]["total_posted_transactions"], 3)

    def test_date_filter_validation(self):
        response = self.client.get(
            "/api/reports/dashboard/?start_date=2026-03-31&end_date=2026-03-01"
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["status"], "error")

    def test_attendance_summary_report_correctness(self):
        response = self.client.get(
            "/api/reports/attendance/?date_preset=CUSTOM&start_date=2026-03-01&end_date=2026-03-31"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["aggregate_total_attendance"], 30)
        self.assertEqual(response.data["data"]["events_with_summary"], 1)
        self.assertEqual(response.data["data"]["attendance_capture_rate_percent"], 100.0)
        self.assertEqual(response.data["data"]["total_member_attendance_records"], 2)
        self.assertEqual(len(response.data["data"]["attendance_trend"]), 1)
        self.assertEqual(response.data["data"]["applied_range"]["date_preset"], "CUSTOM")

    def test_finance_summary_report_correctness_and_balances(self):
        response = self.client.get(
            "/api/reports/finance/?date_preset=CUSTOM&start_date=2026-03-01&end_date=2026-03-31"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["total_posted_transactions"], 3)
        self.assertEqual(response.data["data"]["total_income"], "100.00")
        self.assertEqual(response.data["data"]["total_expense"], "30.00")
        self.assertEqual(response.data["data"]["total_transfers"], "20.00")
        self.assertEqual(len(response.data["data"]["period_breakdown"]), 3)
        self.assertEqual(response.data["data"]["top_categories"], [])

        balances = {
            item["code"]: item["current_balance"] for item in response.data["data"]["balances_by_fund"]
        }
        self.assertEqual(balances["GF"], "100.00")
        self.assertEqual(balances["WF"], "20.00")

    @patch("apps.reporting.serializers.timezone.localdate", return_value=date(2026, 3, 22))
    def test_attendance_date_preset_today_is_applied(self, mocked_localdate):
        response = self.client.get("/api/reports/attendance/?date_preset=TODAY")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["total_events"], 1)
        self.assertEqual(response.data["data"]["applied_range"]["start_date"], "2026-03-22")
        self.assertEqual(response.data["data"]["applied_range"]["end_date"], "2026-03-22")
        self.assertEqual(response.data["data"]["applied_range"]["date_preset"], "TODAY")
        mocked_localdate.assert_called()

    def test_custom_date_preset_requires_full_range(self):
        response = self.client.get("/api/reports/attendance/?date_preset=CUSTOM")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["status"], "error")

    def test_membership_group_household_summary_basics(self):
        members_response = self.client.get("/api/reports/members/")
        households_response = self.client.get("/api/reports/households/")
        groups_response = self.client.get("/api/reports/groups/")

        self.assertEqual(members_response.status_code, status.HTTP_200_OK)
        self.assertEqual(members_response.data["data"]["active_members"], 2)
        self.assertEqual(households_response.data["data"]["total_households"], 2)
        self.assertEqual(households_response.data["data"]["households_with_active_head"], 1)
        self.assertEqual(groups_response.data["data"]["total_groups"], 2)
        self.assertEqual(groups_response.data["data"]["total_active_affiliations"], 2)

    def test_reporting_endpoints_require_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/reports/dashboard/")
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_reporting_endpoints_reject_authenticated_user_without_permissions(self):
        basic_user = User.objects.create_user(
            username="reporting-basic",
            email="reporting-basic@example.com",
            password="StrongPass123",
        )
        self.client.force_authenticate(basic_user)

        response = self.client.get("/api/reports/dashboard/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_membership_secretary_can_access_members_report_but_not_dashboard_or_finance(self):
        membership_secretary = User.objects.create_user(
            username="membership-secretary",
            email="membership-secretary@example.com",
            password="StrongPass123",
        )
        membership_secretary.groups.add(Group.objects.create(name=MEMBERSHIP_SECRETARY_ROLE))
        self.client.force_authenticate(membership_secretary)

        members_response = self.client.get("/api/reports/members/")
        dashboard_response = self.client.get("/api/reports/dashboard/")
        finance_response = self.client.get("/api/reports/finance/")

        self.assertEqual(members_response.status_code, status.HTTP_200_OK)
        self.assertEqual(dashboard_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(finance_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_finance_secretary_can_access_finance_report_but_not_members_report(self):
        finance_secretary = User.objects.create_user(
            username="finance-secretary",
            email="finance-secretary@example.com",
            password="StrongPass123",
        )
        finance_secretary.groups.add(Group.objects.create(name=FINANCE_SECRETARY_ROLE))
        self.client.force_authenticate(finance_secretary)

        finance_response = self.client.get("/api/reports/finance/")
        members_response = self.client.get("/api/reports/members/")

        self.assertEqual(finance_response.status_code, status.HTTP_200_OK)
        self.assertEqual(members_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_user_with_single_unrelated_permission_cannot_access_dashboard(self):
        staff_user = User.objects.create_user(
            username="reporting-staff",
            email="reporting-staff@example.com",
            password="StrongPass123",
            is_staff=True,
        )
        finance_view_permission = Permission.objects.get(
            content_type__app_label="finance",
            codename="view_transaction",
        )
        staff_user.user_permissions.add(finance_view_permission)
        self.client.force_authenticate(staff_user)

        response = self.client.get("/api/reports/dashboard/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
