from drf_spectacular.utils import extend_schema
from rest_framework import views

from apps.common.responses import CustomResponse
from apps.reporting import selectors
from apps.reporting.permissions import ReportingAdminPermission
from apps.reporting.serializers import (
    AttendanceSummarySerializer,
    DashboardOverviewSerializer,
    FinanceSummarySerializer,
    GroupSummarySerializer,
    HouseholdSummarySerializer,
    MembershipSummarySerializer,
    ReportingDateRangeSerializer,
)
from apps.users.constants import (
    ATTENDANCE_REPORT_READ_ROLES,
    DASHBOARD_REPORT_READ_ROLES,
    FINANCE_REPORT_READ_ROLES,
    GROUP_REPORT_READ_ROLES,
    HOUSEHOLD_REPORT_READ_ROLES,
    MEMBERSHIP_REPORT_READ_ROLES,
)


def _get_validated_filters(query_params):
    serializer = ReportingDateRangeSerializer(data=query_params.dict())
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


class DashboardOverviewAdminApi(views.APIView):
    permission_classes = [ReportingAdminPermission]
    read_roles = DASHBOARD_REPORT_READ_ROLES
    required_permissions = (
        "members.view_member",
        "households.view_household",
        "groups.view_group",
        "attendance.view_serviceevent",
        "attendance.view_attendancesummary",
        "finance.view_fundaccount",
        "finance.view_transaction",
    )

    @extend_schema(
        tags=["Admin - Reporting"],
        summary="Get dashboard overview metrics",
        parameters=[ReportingDateRangeSerializer],
        responses=DashboardOverviewSerializer,
    )
    def get(self, request):
        filters = _get_validated_filters(request.query_params)
        data = selectors.get_dashboard_overview(filters=filters)
        serializer = DashboardOverviewSerializer(data)
        return CustomResponse(
            data=serializer.data,
            message="Dashboard overview fetched successfully.",
        )


class MembershipSummaryAdminApi(views.APIView):
    permission_classes = [ReportingAdminPermission]
    read_roles = MEMBERSHIP_REPORT_READ_ROLES
    required_permissions = ("members.view_member",)

    @extend_schema(
        tags=["Admin - Reporting"],
        summary="Get membership summary metrics",
        responses=MembershipSummarySerializer,
    )
    def get(self, request):
        data = selectors.get_membership_summary()
        serializer = MembershipSummarySerializer(data)
        return CustomResponse(
            data=serializer.data,
            message="Membership summary fetched successfully.",
        )


class HouseholdSummaryAdminApi(views.APIView):
    permission_classes = [ReportingAdminPermission]
    read_roles = HOUSEHOLD_REPORT_READ_ROLES
    required_permissions = (
        "households.view_household",
        "households.view_householdmembership",
    )

    @extend_schema(
        tags=["Admin - Reporting"],
        summary="Get household summary metrics",
        responses=HouseholdSummarySerializer,
    )
    def get(self, request):
        data = selectors.get_household_summary()
        serializer = HouseholdSummarySerializer(data)
        return CustomResponse(
            data=serializer.data,
            message="Household summary fetched successfully.",
        )


class GroupSummaryAdminApi(views.APIView):
    permission_classes = [ReportingAdminPermission]
    read_roles = GROUP_REPORT_READ_ROLES
    required_permissions = (
        "groups.view_group",
        "groups.view_groupmembership",
    )

    @extend_schema(
        tags=["Admin - Reporting"],
        summary="Get group summary metrics",
        responses=GroupSummarySerializer,
    )
    def get(self, request):
        data = selectors.get_group_summary()
        serializer = GroupSummarySerializer(data)
        return CustomResponse(
            data=serializer.data,
            message="Group summary fetched successfully.",
        )


class AttendanceSummaryAdminApi(views.APIView):
    permission_classes = [ReportingAdminPermission]
    read_roles = ATTENDANCE_REPORT_READ_ROLES
    required_permissions = (
        "attendance.view_serviceevent",
        "attendance.view_attendancesummary",
        "attendance.view_memberattendance",
    )

    @extend_schema(
        tags=["Admin - Reporting"],
        summary="Get attendance summary metrics",
        parameters=[ReportingDateRangeSerializer],
        responses=AttendanceSummarySerializer,
    )
    def get(self, request):
        filters = _get_validated_filters(request.query_params)
        data = selectors.get_attendance_summary(filters=filters)
        serializer = AttendanceSummarySerializer(data)
        return CustomResponse(
            data=serializer.data,
            message="Attendance summary fetched successfully.",
        )


class FinanceSummaryAdminApi(views.APIView):
    permission_classes = [ReportingAdminPermission]
    read_roles = FINANCE_REPORT_READ_ROLES
    required_permissions = (
        "finance.view_fundaccount",
        "finance.view_transaction",
        "finance.view_transactionline",
    )

    @extend_schema(
        tags=["Admin - Reporting"],
        summary="Get finance summary metrics",
        parameters=[ReportingDateRangeSerializer],
        responses=FinanceSummarySerializer,
    )
    def get(self, request):
        filters = _get_validated_filters(request.query_params)
        data = selectors.get_finance_summary(filters=filters)
        serializer = FinanceSummarySerializer(data)
        return CustomResponse(
            data=serializer.data,
            message="Finance summary fetched successfully.",
        )
