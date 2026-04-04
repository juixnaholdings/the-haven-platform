from drf_spectacular.utils import extend_schema
from rest_framework import status, views
from rest_framework.exceptions import NotFound
from rest_framework.permissions import SAFE_METHODS

from apps.common.responses import CustomResponse
from apps.users import selectors
from apps.users.permissions import SettingsAdminReadPermission, SettingsAdminWritePermission
from apps.users.serializers import (
    BasicUserElevationSerializer,
    BasicUserListFilterSerializer,
    BasicUserListSerializer,
    RoleSummarySerializer,
    StaffInviteCreateSerializer,
    StaffInviteListFilterSerializer,
    StaffInviteListSerializer,
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


def _get_basic_user_or_404(*, user_id: int):
    basic_user = selectors.get_basic_user_by_id(user_id=user_id)
    if basic_user is None:
        raise NotFound("Basic user not found.")
    return basic_user


def _get_staff_invite_or_404(*, staff_invite_id: int):
    staff_invite = selectors.get_staff_invite_by_id(staff_invite_id=staff_invite_id)
    if staff_invite is None:
        raise NotFound("Staff invite not found.")
    return staff_invite


def _get_basic_user_filters(query_params):
    serializer = BasicUserListFilterSerializer(data=query_params.dict())
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def _get_staff_invite_filters(query_params):
    serializer = StaffInviteListFilterSerializer(data=query_params.dict())
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


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

        staff_user = services.create_staff_user(
            data=serializer.validated_data,
            actor=request.user,
        )
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
            actor=request.user,
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


class BasicUserListAdminApi(views.APIView):
    permission_classes = [SettingsAdminReadPermission]

    @extend_schema(
        tags=["Admin - Settings"],
        summary="List basic users eligible for elevation",
        parameters=[BasicUserListFilterSerializer],
        responses=BasicUserListSerializer(many=True),
    )
    def get(self, request):
        users = selectors.list_basic_users(filters=_get_basic_user_filters(request.query_params))
        serializer = BasicUserListSerializer(users, many=True)
        return CustomResponse(
            data=serializer.data,
            message="Basic users fetched successfully.",
        )


class BasicUserElevationAdminApi(views.APIView):
    permission_classes = [SettingsAdminWritePermission]

    @extend_schema(
        tags=["Admin - Settings"],
        summary="Elevate a basic user to staff access",
        request=BasicUserElevationSerializer,
        responses=StaffUserListSerializer,
    )
    def post(self, request, user_id: int):
        basic_user = _get_basic_user_or_404(user_id=user_id)
        serializer = BasicUserElevationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        staff_user = services.elevate_basic_user_to_staff(
            user=basic_user,
            data=serializer.validated_data,
            actor=request.user,
        )
        response_serializer = StaffUserListSerializer(staff_user)
        return CustomResponse(
            data=response_serializer.data,
            message="Basic user elevated successfully.",
            status_code=status.HTTP_200_OK,
        )


class StaffInviteListCreateAdminApi(views.APIView):
    permission_classes = [SettingsAdminReadPermission]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            permission_classes = [SettingsAdminReadPermission]
        else:
            permission_classes = [SettingsAdminWritePermission]
        return [permission() for permission in permission_classes]

    @extend_schema(
        tags=["Admin - Settings"],
        summary="List staff invites",
        parameters=[StaffInviteListFilterSerializer],
        responses=StaffInviteListSerializer(many=True),
    )
    def get(self, request):
        services.expire_pending_staff_invites()
        staff_invites = selectors.list_staff_invites(filters=_get_staff_invite_filters(request.query_params))
        serializer = StaffInviteListSerializer(staff_invites, many=True)
        return CustomResponse(
            data=serializer.data,
            message="Staff invites fetched successfully.",
        )

    @extend_schema(
        tags=["Admin - Settings"],
        summary="Create a staff invite",
        request=StaffInviteCreateSerializer,
        responses=StaffInviteListSerializer,
    )
    def post(self, request):
        serializer = StaffInviteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        staff_invite = services.create_staff_invite(
            data=serializer.validated_data,
            actor=request.user,
        )
        response_serializer = StaffInviteListSerializer(staff_invite)
        return CustomResponse(
            data=response_serializer.data,
            message="Staff invite created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class StaffInviteRevokeAdminApi(views.APIView):
    permission_classes = [SettingsAdminWritePermission]

    @extend_schema(
        tags=["Admin - Settings"],
        summary="Revoke a staff invite",
        request=None,
        responses=StaffInviteListSerializer,
    )
    def patch(self, request, staff_invite_id: int):
        staff_invite = _get_staff_invite_or_404(staff_invite_id=staff_invite_id)
        staff_invite = services.revoke_staff_invite(staff_invite=staff_invite, actor=request.user)
        response_serializer = StaffInviteListSerializer(staff_invite)
        return CustomResponse(
            data=response_serializer.data,
            message="Staff invite updated successfully.",
            status_code=status.HTTP_200_OK,
        )
