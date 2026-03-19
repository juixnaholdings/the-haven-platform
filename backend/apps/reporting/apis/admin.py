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


def _get_validated_filters(query_params):
    serializer = ReportingDateRangeSerializer(data=query_params)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


class DashboardOverviewAdminApi(views.APIView):
    permission_classes = [ReportingAdminPermission]

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
