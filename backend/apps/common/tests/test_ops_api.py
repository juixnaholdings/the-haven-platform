from datetime import timedelta

from django.contrib.auth.models import Group
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.attendance.models import ServiceEvent, ServiceEventType
from apps.common.audit import AuditEventType, AuditTargetType
from apps.common import services as common_services
from apps.users.models import StaffInvite, StaffInviteStatus, User


class OpsNotificationApiTests(APITestCase):
    def setUp(self):
        self.church_admin_group = Group.objects.create(name="Church Admin")
        self.admin_user = User.objects.create_user(
            username="ops-admin",
            email="ops-admin@example.com",
            password="StrongPass123",
            is_staff=True,
        )
        self.admin_user.groups.add(self.church_admin_group)
        self.regular_user = User.objects.create_user(
            username="regular-user",
            email="regular-user@example.com",
            password="StrongPass123",
            is_staff=False,
        )

        now = timezone.now()
        today = timezone.localdate()

        StaffInvite.objects.create(
            email="invitee@example.com",
            token="ops-invite-token",
            status=StaffInviteStatus.PENDING,
            expires_at=now + timedelta(days=5),
            created_by=self.admin_user,
            updated_by=self.admin_user,
        )

        ServiceEvent.objects.create(
            title="Sunday Worship",
            event_type=ServiceEventType.SUNDAY_SERVICE,
            service_date=today - timedelta(days=1),
            location="Main Auditorium",
            is_active=True,
            created_by=self.admin_user,
            updated_by=self.admin_user,
        )
        ServiceEvent.objects.create(
            title="Midweek Prayer",
            event_type=ServiceEventType.PRAYER_MEETING,
            service_date=today + timedelta(days=2),
            location="Prayer Hall",
            is_active=True,
            created_by=self.admin_user,
            updated_by=self.admin_user,
        )

        common_services.log_audit_event(
            actor=self.admin_user,
            event_type=AuditEventType.FINANCE_TRANSACTION_CREATED,
            target_type=AuditTargetType.FINANCE_TRANSACTION,
            target_id=901,
            summary="Recorded transfer transaction 'FIN-OPS-001'.",
            payload={"reference_no": "FIN-OPS-001"},
        )

    def test_ops_notifications_requires_authentication(self):
        response = self.client.get("/api/ops/notifications/")
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_ops_notifications_returns_operational_reminders_for_admin_user(self):
        self.client.force_authenticate(self.admin_user)
        response = self.client.get("/api/ops/notifications/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")

        data = response.data["data"]
        notifications = data["notifications"]
        kinds = {notification["kind"] for notification in notifications}

        self.assertIn("STAFF_INVITES_PENDING", kinds)
        self.assertIn("ATTENDANCE_MISSING_SUMMARY", kinds)
        self.assertIn("UPCOMING_EVENT", kinds)
        self.assertIn("FINANCE_ACTION_CONFIRMATION", kinds)
        self.assertEqual(data["notification_count"], len(notifications))
        self.assertEqual(data["unread_count"], len(notifications))

    def test_ops_notifications_hides_admin_operational_reminders_for_basic_user(self):
        self.client.force_authenticate(self.regular_user)
        response = self.client.get("/api/ops/notifications/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["data"]["notification_count"], 0)
        self.assertEqual(response.data["data"]["notifications"], [])
