from django.urls import path

from apps.attendance.apis.admin import (
    AttendanceSummaryAdminApi,
    MemberAttendanceDetailAdminApi,
    MemberAttendanceListCreateAdminApi,
    ServiceEventDetailAdminApi,
    ServiceEventListCreateAdminApi,
    SundayServiceFocusAdminApi,
)

urlpatterns = [
    path("", ServiceEventListCreateAdminApi.as_view(), name="service-event-list-create"),
    path(
        "sunday-service/current/",
        SundayServiceFocusAdminApi.as_view(),
        name="current-sunday-service",
    ),
    path("<int:service_event_id>/", ServiceEventDetailAdminApi.as_view(), name="service-event-detail"),
    path(
        "<int:service_event_id>/summary/",
        AttendanceSummaryAdminApi.as_view(),
        name="attendance-summary-upsert",
    ),
    path(
        "<int:service_event_id>/member-attendance/",
        MemberAttendanceListCreateAdminApi.as_view(),
        name="member-attendance-list-create",
    ),
    path(
        "<int:service_event_id>/member-attendance/<int:member_attendance_id>/",
        MemberAttendanceDetailAdminApi.as_view(),
        name="member-attendance-detail",
    ),
]
