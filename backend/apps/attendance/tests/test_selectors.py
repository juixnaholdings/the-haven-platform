from datetime import date

from django.test import TestCase

from apps.attendance import selectors, services
from apps.attendance.models import ServiceEventType
from apps.members.models import Member


class AttendanceSelectorTests(TestCase):
    def setUp(self):
        self.service_event = services.create_service_event(
            data={
                "title": "Sunday Morning Service",
                "event_type": ServiceEventType.SUNDAY_SERVICE,
                "service_date": date(2026, 3, 15),
                "location": "Main Auditorium",
                "is_active": True,
            }
        )
        self.other_service_event = services.create_service_event(
            data={
                "title": "Prayer Meeting",
                "event_type": ServiceEventType.PRAYER_MEETING,
                "service_date": date(2026, 3, 16),
                "location": "Chapel",
                "is_active": True,
            }
        )
        self.member = Member.objects.create(first_name="Ama", last_name="Mensah")
        services.create_or_update_attendance_summary(
            service_event=self.service_event,
            data={
                "men_count": 9,
                "women_count": 14,
                "children_count": 4,
                "visitor_count": 2,
                "total_count": 27,
            },
        )
        services.record_member_attendance(
            service_event=self.service_event,
            member=self.member,
            status="PRESENT",
        )
        services.record_member_attendance(
            service_event=self.other_service_event,
            member=Member.objects.create(first_name="Kojo", last_name="Boateng"),
            status="ABSENT",
        )

    def test_get_service_event_detail_includes_summary_and_member_attendance(self):
        service_event = selectors.get_service_event_detail(service_event_id=self.service_event.id)

        self.assertEqual(service_event.attendance_summary.total_count, 27)
        self.assertEqual(service_event.member_attendances.count(), 1)

    def test_list_member_attendance_for_event_filters_event_records(self):
        member_attendances = selectors.list_member_attendance_for_event(
            service_event_id=self.service_event.id
        )

        self.assertEqual(member_attendances.count(), 1)
        self.assertEqual(member_attendances.first().service_event, self.service_event)
