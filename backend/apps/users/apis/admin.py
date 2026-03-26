from drf_spectacular.utils import extend_schema
from rest_framework import status, views
from rest_framework.exceptions import NotFound
from rest_framework.permissions import SAFE_METHODS

from apps.common.responses import CustomResponse
from apps.users import selectors
from apps.users.permissions import SettingsAdminReadPermission, SettingsAdminWritePermission
from apps.users.serializers import (
    RoleSummarySerializer,
    StaffUserCreateSerializer,
    StaffUserListSerializer,
    StaffUserUpdateSerializer,
)
from apps.users import services


def _get_staff_user_or_404(*, staff_user_id: int):
    staff_user = selectors.get_staff_user_by_id(staff_user_id=staff_user_id)
    if staff_user is None:
        raise NotFound("Staff user not found.")
    return staff_user


class StaffUserListCreateAdminApi(views.APIView):
    permission_classes = [SettingsAdminReadPermission]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            permission_classes = [SettingsAdminReadPermission]
        else:
            permission_classes = [SettingsAdminWritePermission]
        return [permission() for permission in permission_classes]

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

    @extend_schema(
        tags=["Admin - Settings"],
        summary="Create staff user",
        request=StaffUserCreateSerializer,
        responses=StaffUserListSerializer,
    )
    def post(self, request):
        serializer = StaffUserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        staff_user = services.create_staff_user(data=serializer.validated_data)
        response_serializer = StaffUserListSerializer(staff_user)
        return CustomResponse(
            data=response_serializer.data,
            message="Staff user created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class StaffUserDetailAdminApi(views.APIView):
    permission_classes = [SettingsAdminReadPermission]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            permission_classes = [SettingsAdminReadPermission]
        else:
            permission_classes = [SettingsAdminWritePermission]
        return [permission() for permission in permission_classes]

    @extend_schema(
        tags=["Admin - Settings"],
        summary="Retrieve staff user",
        responses=StaffUserListSerializer,
    )
    def get(self, request, staff_user_id: int):
        staff_user = _get_staff_user_or_404(staff_user_id=staff_user_id)
        serializer = StaffUserListSerializer(staff_user)
        return CustomResponse(
            data=serializer.data,
            message="Staff user fetched successfully.",
        )

    @extend_schema(
        tags=["Admin - Settings"],
        summary="Update staff user",
        request=StaffUserUpdateSerializer,
        responses=StaffUserListSerializer,
    )
    def patch(self, request, staff_user_id: int):
        staff_user = _get_staff_user_or_404(staff_user_id=staff_user_id)
        serializer = StaffUserUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        staff_user = services.update_staff_user(
            user=staff_user,
            data=serializer.validated_data,
        )
        response_serializer = StaffUserListSerializer(staff_user)
        return CustomResponse(
            data=response_serializer.data,
            message="Staff user updated successfully.",
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
