from datetime import date
from decimal import Decimal

from django.test import TestCase

from apps.attendance import services as attendance_services
from apps.attendance.models import ServiceEventType
from apps.finance import services as finance_services
from apps.groups import services as group_services
from apps.households import services as household_services
from apps.households.models import HouseholdRelationship
from apps.members.models import Member
from apps.reporting import selectors


class ReportingSelectorTests(TestCase):
    def setUp(self):
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

    def test_get_dashboard_overview_returns_cross_domain_metrics(self):
        summary = selectors.get_dashboard_overview(
            filters={"start_date": date(2026, 3, 1), "end_date": date(2026, 3, 31)}
        )

        self.assertEqual(summary["members"]["total_members"], 3)
        self.assertEqual(summary["members"]["active_members"], 2)
        self.assertEqual(summary["households"]["total_households"], 2)
        self.assertEqual(summary["groups"]["total_groups"], 2)
        self.assertEqual(summary["attendance"]["total_events"], 1)
        self.assertEqual(summary["finance"]["total_fund_accounts"], 2)

    def test_get_attendance_summary_respects_date_range(self):
        summary = selectors.get_attendance_summary(
            filters={"start_date": date(2026, 3, 1), "end_date": date(2026, 3, 31)}
        )

        self.assertEqual(summary["total_events"], 1)
        self.assertEqual(summary["aggregate_total_attendance"], 30)
        self.assertEqual(summary["total_member_attendance_records"], 2)

    def test_get_attendance_summary_includes_sunday_service_operational_metrics(self):
        sunday_not_started = attendance_services.create_service_event(
            data={
                "title": "System Sunday 1",
                "event_type": ServiceEventType.SUNDAY_SERVICE,
                "service_date": date(2026, 3, 8),
                "location": "Main Auditorium",
                "is_active": True,
                "is_system_managed": True,
            }
        )
        sunday_partial = attendance_services.create_service_event(
            data={
                "title": "System Sunday 2",
                "event_type": ServiceEventType.SUNDAY_SERVICE,
                "service_date": date(2026, 3, 15),
                "location": "Main Auditorium",
                "is_active": True,
                "is_system_managed": True,
            }
        )
        sunday_recorded = attendance_services.create_service_event(
            data={
                "title": "System Sunday 3",
                "event_type": ServiceEventType.SUNDAY_SERVICE,
                "service_date": date(2026, 3, 22),
                "location": "Main Auditorium",
                "is_active": True,
                "is_system_managed": True,
            }
        )

        attendance_services.create_or_update_attendance_summary(
            service_event=sunday_partial,
            data={
                "men_count": 8,
                "women_count": 10,
                "children_count": 5,
                "visitor_count": 3,
                "total_count": 23,
            },
        )
        attendance_services.create_or_update_attendance_summary(
            service_event=sunday_recorded,
            data={
                "men_count": 12,
                "women_count": 14,
                "children_count": 6,
                "visitor_count": 4,
                "total_count": 32,
            },
        )
        attendance_services.record_member_attendance(
            service_event=sunday_recorded,
            member=self.member_1,
            status="PRESENT",
        )

        summary = selectors.get_attendance_summary(
            filters={"start_date": date(2026, 3, 1), "end_date": date(2026, 3, 31)}
        )

        sunday_summary = summary["sunday_services"]
        self.assertEqual(sunday_summary["total_services"], 3)
        self.assertEqual(sunday_summary["with_summary_count"], 2)
        self.assertEqual(sunday_summary["with_member_records_count"], 1)
        self.assertEqual(sunday_summary["fully_recorded_count"], 1)
        self.assertEqual(sunday_summary["partially_recorded_count"], 1)
        self.assertEqual(sunday_summary["not_started_count"], 1)
        self.assertEqual(sunday_summary["latest_service"]["id"], sunday_recorded.id)

        state_by_service_id = {
            row["id"]: row["attendance_state"]
            for row in sunday_summary["recent_services"]
        }
        self.assertEqual(state_by_service_id[sunday_not_started.id], "NOT_STARTED")
        self.assertEqual(state_by_service_id[sunday_partial.id], "IN_PROGRESS")
        self.assertEqual(state_by_service_id[sunday_recorded.id], "RECORDED")

    def test_get_finance_summary_returns_balances_and_range_totals(self):
        summary = selectors.get_finance_summary(
            filters={"start_date": date(2026, 3, 1), "end_date": date(2026, 3, 31)}
        )

        balances = {item["code"]: item["current_balance"] for item in summary["balances_by_fund"]}

        self.assertEqual(summary["total_income"], Decimal("100.00"))
        self.assertEqual(summary["total_expense"], Decimal("30.00"))
        self.assertEqual(summary["total_transfers"], Decimal("20.00"))
        self.assertEqual(summary["net_flow"], Decimal("70.00"))
        self.assertEqual(balances["GF"], Decimal("100.00"))
        self.assertEqual(balances["WF"], Decimal("20.00"))
