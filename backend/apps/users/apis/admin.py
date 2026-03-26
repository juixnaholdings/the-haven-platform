from drf_spectacular.utils import extend_schema
from rest_framework import views

from apps.common.responses import CustomResponse
from apps.users import selectors
from apps.users.permissions import SettingsAdminReadPermission
from apps.users.serializers import RoleSummarySerializer, StaffUserListSerializer


class StaffUserListAdminApi(views.APIView):
    permission_classes = [SettingsAdminReadPermission]

    @extend_schema(
        tags=["Admin - Settings"],
        summary="List staff users",
        responses=StaffUserListSerializer(many=True),
    )
    def get(self, request):
        users = selectors.list_staff_users()
        serializer = StaffUserListSerializer(users, many=True)
        return CustomResponse(
            data=serializer.data,
            message="Staff users fetched successfully.",
        )


class RoleSummaryListAdminApi(views.APIView):
    permission_classes = [SettingsAdminReadPermission]

    @extend_schema(
        tags=["Admin - Settings"],
        summary="List role summaries",
        responses=RoleSummarySerializer(many=True),
    )
    def get(self, request):
        roles = selectors.list_role_summaries()
        serializer = RoleSummarySerializer(roles, many=True)
        return CustomResponse(
            data=serializer.data,
            message="Role summaries fetched successfully.",
        )
