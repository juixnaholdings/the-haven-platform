from datetime import date

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.attendance.models import ServiceEvent, ServiceEventType
from apps.members.models import Member

User = get_user_model()


class AttendanceAdminApiTests(APITestCase):
    def setUp(self):
        self.admin_user = User.objects.create_superuser(
            username="attendance-admin",
            email="attendance-admin@example.com",
            password="StrongPass123",
        )
        self.client.force_authenticate(self.admin_user)
        self.service_event = ServiceEvent.objects.create(
            title="Sunday Morning Service",
            event_type=ServiceEventType.SUNDAY_SERVICE,
            service_date=date(2026, 3, 15),
            location="Main Auditorium",
            is_active=True,
        )
        self.member = Member.objects.create(first_name="Ama", last_name="Mensah")

    def test_list_and_detail_service_events(self):
        list_response = self.client.get("/api/attendance/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(list_response.data["data"]), 1)
        self.assertTrue(
            any(
                event["title"] == "Sunday Morning Service"
                for event in list_response.data["data"]
            )
        )

        detail_response = self.client.get(f"/api/attendance/{self.service_event.id}/")
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["data"]["title"], "Sunday Morning Service")

    def test_list_service_events_supports_optional_pagination(self):
        ServiceEvent.objects.create(
            title="Prayer Meeting",
            event_type=ServiceEventType.PRAYER_MEETING,
            service_date=date(2026, 3, 16),
            is_active=True,
        )

        response = self.client.get("/api/attendance/?page=1&page_size=1")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["data"]["count"], 2)
        self.assertEqual(response.data["data"]["page"], 1)
        self.assertEqual(response.data["data"]["page_size"], 1)
        self.assertEqual(len(response.data["data"]["results"]), 1)

    def test_create_service_event(self):
        response = self.client.post(
            "/api/attendance/",
            {
                "title": "Midweek Service",
                "event_type": ServiceEventType.MIDWEEK_SERVICE,
                "service_date": "2026-03-18",
                "start_time": "18:30:00",
                "end_time": "20:00:00",
                "location": "Main Auditorium",
                "notes": "Wednesday gathering",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["title"], "Midweek Service")
        self.assertTrue(ServiceEvent.objects.filter(title="Midweek Service").exists())

    def test_create_and_update_attendance_summary(self):
        create_response = self.client.put(
            f"/api/attendance/{self.service_event.id}/summary/",
            {
                "men_count": 10,
                "women_count": 15,
                "children_count": 5,
                "visitor_count": 3,
                "total_count": 30,
                "notes": "Healthy turnout",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            create_response.data["data"]["attendance_summary"]["total_count"],
            30,
        )

        update_response = self.client.patch(
            f"/api/attendance/{self.service_event.id}/summary/",
            {"visitor_count": 4},
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            update_response.data["data"]["attendance_summary"]["visitor_count"],
            4,
        )

    def test_summary_total_validation_returns_error(self):
        response = self.client.put(
            f"/api/attendance/{self.service_event.id}/summary/",
            {
                "men_count": 10,
                "women_count": 15,
                "children_count": 5,
                "visitor_count": 3,
                "total_count": 29,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["status"], "error")

    def test_list_create_and_update_member_attendance(self):
        create_response = self.client.post(
            f"/api/attendance/{self.service_event.id}/member-attendance/",
            {
                "member_id": self.member.id,
                "status": "PRESENT",
                "checked_in_at": timezone.now().isoformat(),
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        member_attendance_id = create_response.data["data"]["member_attendances"][0]["id"]

        list_response = self.client.get(
            f"/api/attendance/{self.service_event.id}/member-attendance/"
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data["data"]), 1)

        update_response = self.client.patch(
            f"/api/attendance/{self.service_event.id}/member-attendance/{member_attendance_id}/",
            {"status": "LATE"},
            format="json",
        )

        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["data"]["status"], "LATE")

    def test_attendance_endpoints_require_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/attendance/")
        self.assertIn(
            response.status_code,
            [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN],
        )

    def test_attendance_endpoints_reject_authenticated_user_without_permissions(self):
        basic_user = User.objects.create_user(
            username="attendance-basic",
            email="attendance-basic@example.com",
            password="StrongPass123",
        )
        self.client.force_authenticate(basic_user)

        response = self.client.get("/api/attendance/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
