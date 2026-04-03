from datetime import date
from io import StringIO
from unittest.mock import patch

from django.core.management import CommandError, call_command
from django.test import TestCase

from apps.attendance.models import ServiceEvent, ServiceEventType


class EnsureSundayServicesCommandTests(TestCase):
    def test_ensure_sunday_services_creates_expected_window(self):
        stdout = StringIO()

        with patch("apps.attendance.services.timezone.localdate", return_value=date(2026, 3, 18)):
            call_command(
                "ensure_sunday_services",
                weeks_back=1,
                weeks_forward=2,
                stdout=stdout,
            )

        sunday_services = ServiceEvent.objects.filter(
            event_type=ServiceEventType.SUNDAY_SERVICE,
            is_system_managed=True,
        )
        self.assertEqual(sunday_services.count(), 4)
        self.assertIn("System-managed Sunday services ensured.", stdout.getvalue())

    def test_ensure_sunday_services_is_idempotent(self):
        with patch("apps.attendance.services.timezone.localdate", return_value=date(2026, 3, 18)):
            call_command("ensure_sunday_services", weeks_back=1, weeks_forward=2)
            call_command("ensure_sunday_services", weeks_back=1, weeks_forward=2)

        self.assertEqual(
            ServiceEvent.objects.filter(
                event_type=ServiceEventType.SUNDAY_SERVICE,
                is_system_managed=True,
            ).count(),
            4,
        )

    def test_ensure_sunday_services_rejects_negative_weeks(self):
        with self.assertRaises(CommandError):
            call_command("ensure_sunday_services", weeks_back=-1, weeks_forward=1)
