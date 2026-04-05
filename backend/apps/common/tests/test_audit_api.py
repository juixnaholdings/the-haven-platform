from django.contrib.auth.models import Group
from rest_framework import status
from rest_framework.test import APITestCase

from apps.common.audit import AuditEventType, AuditTargetType
from apps.common import services as common_services
from apps.common.models import AuditEvent
from apps.users.models import User


class AuditEventApiTests(APITestCase):
    def setUp(self):
        self.church_admin_group = Group.objects.create(name="Church Admin")
        self.admin_user = User.objects.create_user(
            username="churchadmin",
            email="churchadmin@example.com",
            password="StrongPass123",
            is_staff=True,
        )
        self.admin_user.groups.add(self.church_admin_group)

        self.regular_user = User.objects.create_user(
            username="member1",
            email="member1@example.com",
            password="StrongPass123",
        )

        common_services.log_audit_event(
            actor=self.admin_user,
            event_type=AuditEventType.MEMBER_CREATED,
            target_type=AuditTargetType.MEMBER,
            target_id=101,
            summary="Created member 'Grace Adewale'.",
            payload={"is_active": True},
        )
        common_services.log_audit_event(
            actor=self.admin_user,
            event_type=AuditEventType.MEMBER_CREATED,
            target_type=AuditTargetType.MEMBER,
            target_id=102,
            summary="Created member 'Samuel Okoro'.",
            payload={"is_active": True},
        )
        common_services.log_audit_event(
            actor=self.admin_user,
            event_type=AuditEventType.FINANCE_TRANSACTION_CREATED,
            target_type=AuditTargetType.FINANCE_TRANSACTION,
            target_id=501,
            summary="Recorded transfer transaction 'FIN-0001'.",
            payload={"transaction_type": "TRANSFER"},
        )

    def test_audit_events_requires_admin_access(self):
        self.client.force_authenticate(user=self.regular_user)

        response = self.client.get("/api/audit/events/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["status"], "error")

    def test_audit_events_support_filters_and_optional_pagination(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(
            "/api/audit/events/",
            {
                "event_type": AuditEventType.MEMBER_CREATED,
                "actor_id": self.admin_user.id,
                "page": 1,
                "page_size": 1,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["data"]["count"], 2)
        self.assertEqual(response.data["data"]["page"], 1)
        self.assertEqual(response.data["data"]["page_size"], 1)
        self.assertEqual(len(response.data["data"]["results"]), 1)
        self.assertEqual(
            response.data["data"]["results"][0]["event_type"],
            AuditEventType.MEMBER_CREATED,
        )

    def test_audit_events_support_search_and_actor_username_filters(self):
        self.client.force_authenticate(user=self.admin_user)

        search_response = self.client.get(
            "/api/audit/events/",
            {
                "search": "transfer",
            },
        )
        self.assertEqual(search_response.status_code, status.HTTP_200_OK)
        self.assertEqual(search_response.data["status"], "success")
        self.assertEqual(search_response.data["data"][0]["target_type"], AuditTargetType.FINANCE_TRANSACTION)

        actor_response = self.client.get(
            "/api/audit/events/",
            {
                "actor_username": "church",
                "event_type": AuditEventType.MEMBER_CREATED,
            },
        )
        self.assertEqual(actor_response.status_code, status.HTTP_200_OK)
        self.assertEqual(actor_response.data["status"], "success")
        self.assertEqual(len(actor_response.data["data"]), 2)

    def test_audit_event_detail_returns_one_event(self):
        self.client.force_authenticate(user=self.admin_user)
        event = AuditEvent.objects.get(target_id=501)

        response = self.client.get(f"/api/audit/events/{event.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")
        self.assertEqual(response.data["data"]["id"], event.id)
        self.assertEqual(
            response.data["data"]["event_type"],
            AuditEventType.FINANCE_TRANSACTION_CREATED,
        )
