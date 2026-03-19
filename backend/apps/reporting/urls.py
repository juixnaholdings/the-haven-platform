from django.urls import path

from apps.reporting.apis.admin import (
    AttendanceSummaryAdminApi,
    DashboardOverviewAdminApi,
    FinanceSummaryAdminApi,
    GroupSummaryAdminApi,
    HouseholdSummaryAdminApi,
    MembershipSummaryAdminApi,
)

urlpatterns = [
    path("dashboard/", DashboardOverviewAdminApi.as_view(), name="report-dashboard"),
    path("members/", MembershipSummaryAdminApi.as_view(), name="report-members"),
    path("households/", HouseholdSummaryAdminApi.as_view(), name="report-households"),
    path("groups/", GroupSummaryAdminApi.as_view(), name="report-groups"),
    path("attendance/", AttendanceSummaryAdminApi.as_view(), name="report-attendance"),
    path("finance/", FinanceSummaryAdminApi.as_view(), name="report-finance"),
]
