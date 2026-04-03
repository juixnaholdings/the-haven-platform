from datetime import date, time

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.attendance import services
from apps.attendance.models import (
    AttendanceSummary,
    MemberAttendance,
    ServiceEvent,
    ServiceEventType,
)
from apps.members.models import Member

User = get_user_model()


class AttendanceServiceTests(TestCase):
    def setUp(self):
        self.actor = User.objects.create_superuser(
            username="attendance-service-admin",
            email="attendance-service-admin@example.com",
            password="StrongPass123",
        )
        self.service_event = services.create_service_event(
            data={
                "title": "Sunday Morning Service",
                "event_type": ServiceEventType.SUNDAY_SERVICE,
                "service_date": date(2026, 3, 15),
                "start_time": time(9, 0),
                "end_time": time(11, 0),
                "location": "Main Auditorium",
                "notes": "Main weekly gathering",
                "is_active": True,
            },
            actor=self.actor,
        )
        self.member = Member.objects.create(first_name="Ama", last_name="Mensah")

    def test_service_event_creation(self):
        self.assertEqual(self.service_event.title, "Sunday Morning Service")
        self.assertEqual(self.service_event.created_by, self.actor)
        self.assertEqual(self.service_event.event_type, ServiceEventType.SUNDAY_SERVICE)

    def test_service_event_time_validation_rejects_end_before_start(self):
        with self.assertRaises(ValidationError):
            services.create_service_event(
                data={
                    "title": "Prayer Meeting",
                    "event_type": ServiceEventType.PRAYER_MEETING,
                    "service_date": date(2026, 3, 16),
                    "start_time": time(19, 0),
                    "end_time": time(18, 30),
                    "location": "",
                    "notes": "",
                    "is_active": True,
                },
                actor=self.actor,
            )

    def test_attendance_summary_creation(self):
        summary = services.create_or_update_attendance_summary(
            service_event=self.service_event,
            data={
                "men_count": 10,
                "women_count": 15,
                "children_count": 5,
                "visitor_count": 3,
                "total_count": 30,
                "notes": "Strong turnout",
            },
            actor=self.actor,
        )

        self.assertEqual(summary.service_event, self.service_event)
        self.assertEqual(summary.total_count, 30)
        self.assertEqual(summary.created_by, self.actor)

    def test_summary_total_validation(self):
        with self.assertRaises(ValidationError):
            services.create_or_update_attendance_summary(
                service_event=self.service_event,
                data={
                    "men_count": 10,
                    "women_count": 15,
                    "children_count": 5,
                    "visitor_count": 3,
                    "total_count": 40,
                },
                actor=self.actor,
            )

    def test_member_attendance_creation(self):
        member_attendance = services.record_member_attendance(
            service_event=self.service_event,
            member=self.member,
            status="PRESENT",
            checked_in_at=timezone.now(),
            actor=self.actor,
        )

        self.assertEqual(member_attendance.service_event, self.service_event)
        self.assertEqual(member_attendance.member, self.member)
        self.assertEqual(member_attendance.status, "PRESENT")

    def test_duplicate_member_attendance_rejection_for_same_event_member(self):
        services.record_member_attendance(
            service_event=self.service_event,
            member=self.member,
            status="PRESENT",
            actor=self.actor,
        )

        with self.assertRaises(ValidationError):
            services.record_member_attendance(
                service_event=self.service_event,
                member=self.member,
                status="LATE",
                actor=self.actor,
            )

    def test_summary_and_member_attendance_coexist_correctly(self):
        services.create_or_update_attendance_summary(
            service_event=self.service_event,
            data={
                "men_count": 12,
                "women_count": 18,
                "children_count": 6,
                "visitor_count": 4,
                "total_count": 36,
            },
            actor=self.actor,
        )
        services.record_member_attendance(
            service_event=self.service_event,
            member=self.member,
            status="PRESENT",
            actor=self.actor,
        )

        self.assertTrue(
            AttendanceSummary.objects.filter(service_event=self.service_event).exists()
        )
        self.assertTrue(
            MemberAttendance.objects.filter(
                service_event=self.service_event,
                member=self.member,
            ).exists()
        )

    def test_ensure_system_managed_sunday_services_is_idempotent(self):
        first_run = services.ensure_system_managed_sunday_services(
            weeks_back=1,
            weeks_forward=2,
            reference_date=date(2026, 3, 18),
            actor=self.actor,
        )
        second_run = services.ensure_system_managed_sunday_services(
            weeks_back=1,
            weeks_forward=2,
            reference_date=date(2026, 3, 18),
            actor=self.actor,
        )

        self.assertEqual(len(first_run), 4)
        self.assertEqual(len(second_run), 4)
        self.assertEqual(
            ServiceEvent.objects.filter(
                event_type=ServiceEventType.SUNDAY_SERVICE,
                is_system_managed=True,
            ).count(),
            4,
        )

    def test_ensure_system_managed_sunday_services_marks_events_active(self):
        services.ensure_system_managed_sunday_services(
            weeks_back=0,
            weeks_forward=0,
            reference_date=date(2026, 3, 22),
            actor=self.actor,
        )
        sunday_event = ServiceEvent.objects.get(
            event_type=ServiceEventType.SUNDAY_SERVICE,
            is_system_managed=True,
            service_date=date(2026, 3, 22),
        )
        sunday_event.is_active = False
        sunday_event.save(update_fields=["is_active"])

        services.ensure_system_managed_sunday_services(
            weeks_back=0,
            weeks_forward=0,
            reference_date=date(2026, 3, 22),
            actor=self.actor,
        )

        sunday_event.refresh_from_db()
        self.assertTrue(sunday_event.is_active)

    def test_ensure_system_managed_sunday_services_rejects_negative_weeks(self):
        with self.assertRaises(ValidationError):
            services.ensure_system_managed_sunday_services(
                weeks_back=-1,
                weeks_forward=1,
                reference_date=date(2026, 3, 22),
            )
