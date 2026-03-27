from datetime import date
from decimal import Decimal

from django.contrib.auth.models import Group
from django.test import TestCase

from apps.attendance import services as attendance_services
from apps.attendance.models import AttendanceStatus, ServiceEventType
from apps.common.audit import AuditEventType, AuditTargetType
from apps.common.models import AuditEvent
from apps.finance import services as finance_services
from apps.groups import services as group_services
from apps.households import services as household_services
from apps.members import services as member_services
from apps.users import services as user_services
from apps.users.models import User


class AuditLoggingIntegrationTests(TestCase):
    def setUp(self):
        self.actor = User.objects.create_user(
            username="auditor",
            email="auditor@example.com",
            password="StrongPass123",
            is_staff=True,
        )

    def test_member_create_and_update_are_logged(self):
        member = member_services.create_member(
            data={"first_name": "Grace", "last_name": "Adewale"},
            actor=self.actor,
        )
        member_services.update_member(
            member=member,
            data={"notes": "Updated note"},
            actor=self.actor,
        )

        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEventType.MEMBER_CREATED,
                target_type=AuditTargetType.MEMBER,
                target_id=member.id,
            ).exists()
        )
        update_event = AuditEvent.objects.filter(
            event_type=AuditEventType.MEMBER_UPDATED,
            target_id=member.id,
        ).first()
        self.assertIsNotNone(update_event)
        self.assertEqual(update_event.actor_id, self.actor.id)
        self.assertIn("notes", update_event.payload["changed_fields"])

    def test_household_membership_create_and_update_are_logged(self):
        member = member_services.create_member(
            data={"first_name": "Samuel", "last_name": "Okoro"},
            actor=self.actor,
        )
        household = household_services.create_household(
            data={"name": "Okoro Household"},
            actor=self.actor,
        )
        membership = household_services.add_member_to_household(
            household=household,
            member=member,
            actor=self.actor,
        )
        household_services.update_household_membership(
            membership=membership,
            data={"is_active": False},
            actor=self.actor,
        )

        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEventType.HOUSEHOLD_MEMBERSHIP_CREATED,
                target_id=membership.id,
            ).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEventType.HOUSEHOLD_MEMBERSHIP_UPDATED,
                target_id=membership.id,
            ).exists()
        )

    def test_group_membership_create_and_update_are_logged(self):
        member = member_services.create_member(
            data={"first_name": "Daniel", "last_name": "Nwosu"},
            actor=self.actor,
        )
        group = group_services.create_group(
            data={"name": "Choir Ministry"},
            actor=self.actor,
        )
        membership = group_services.add_member_to_group(
            group=group,
            member=member,
            role_name="Singer",
            actor=self.actor,
        )
        group_services.update_group_membership(
            membership=membership,
            data={"role_name": "Lead Singer"},
            actor=self.actor,
        )

        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEventType.GROUP_MEMBERSHIP_CREATED,
                target_id=membership.id,
            ).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEventType.GROUP_MEMBERSHIP_UPDATED,
                target_id=membership.id,
            ).exists()
        )

    def test_attendance_summary_and_member_attendance_changes_are_logged(self):
        member = member_services.create_member(
            data={"first_name": "Ruth", "last_name": "Johnson"},
            actor=self.actor,
        )
        event = attendance_services.create_service_event(
            data={
                "title": "Sunday Morning Service",
                "event_type": ServiceEventType.SUNDAY_SERVICE,
                "service_date": date(2026, 3, 1),
            },
            actor=self.actor,
        )

        summary = attendance_services.create_or_update_attendance_summary(
            service_event=event,
            data={
                "men_count": 10,
                "women_count": 15,
                "children_count": 8,
                "visitor_count": 4,
                "total_count": 33,
            },
            actor=self.actor,
        )
        attendance_services.create_or_update_attendance_summary(
            service_event=event,
            data={
                "men_count": 11,
                "women_count": 15,
                "children_count": 8,
                "visitor_count": 5,
                "total_count": 34,
            },
            actor=self.actor,
        )
        member_attendance = attendance_services.record_member_attendance(
            service_event=event,
            member=member,
            status=AttendanceStatus.PRESENT,
            actor=self.actor,
        )
        attendance_services.update_member_attendance(
            member_attendance=member_attendance,
            data={"status": AttendanceStatus.LATE},
            actor=self.actor,
        )

        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEventType.ATTENDANCE_SUMMARY_CREATED,
                target_id=summary.id,
            ).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEventType.ATTENDANCE_SUMMARY_UPDATED,
                target_id=summary.id,
            ).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEventType.MEMBER_ATTENDANCE_CREATED,
                target_id=member_attendance.id,
            ).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEventType.MEMBER_ATTENDANCE_UPDATED,
                target_id=member_attendance.id,
            ).exists()
        )

    def test_finance_transaction_create_and_update_are_logged(self):
        fund_account = finance_services.create_fund_account(
            data={"name": "General Fund", "code": "GEN"},
            actor=self.actor,
        )
        destination_fund = finance_services.create_fund_account(
            data={"name": "Building Fund", "code": "BLD"},
            actor=self.actor,
        )
        income_transaction = finance_services.record_income(
            fund_account=fund_account,
            amount=Decimal("100.00"),
            transaction_date=date(2026, 3, 10),
            description="Sunday offering",
            actor=self.actor,
        )
        transfer_transaction = finance_services.record_transfer(
            source_fund_account=fund_account,
            destination_fund_account=destination_fund,
            amount=Decimal("50.00"),
            transaction_date=date(2026, 3, 11),
            description="Transfer to building fund",
            actor=self.actor,
        )
        finance_services.update_transaction_metadata(
            transaction=income_transaction,
            data={"description": "Updated Sunday offering"},
            actor=self.actor,
        )

        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEventType.FINANCE_TRANSACTION_CREATED,
                target_id=income_transaction.id,
            ).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEventType.FINANCE_TRANSACTION_CREATED,
                target_id=transfer_transaction.id,
            ).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEventType.FINANCE_TRANSACTION_UPDATED,
                target_id=income_transaction.id,
            ).exists()
        )

    def test_staff_user_create_update_and_role_assignment_are_logged(self):
        church_admin_role = Group.objects.create(name="Church Admin")
        finance_secretary_role = Group.objects.create(name="Finance Secretary")

        staff_user = user_services.create_staff_user(
            data={
                "username": "staffuser",
                "email": "staffuser@example.com",
                "password": "StrongPass123",
                "role_ids": [church_admin_role],
            },
            actor=self.actor,
        )
        user_services.update_staff_user(
            user=staff_user,
            data={
                "is_active": False,
                "role_ids": [finance_secretary_role],
            },
            actor=self.actor,
        )

        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEventType.STAFF_USER_CREATED,
                target_id=staff_user.id,
            ).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEventType.STAFF_USER_UPDATED,
                target_id=staff_user.id,
            ).exists()
        )
        self.assertTrue(
            AuditEvent.objects.filter(
                event_type=AuditEventType.STAFF_ROLE_ASSIGNMENT_UPDATED,
                target_id=staff_user.id,
            ).exists()
        )
