from drf_spectacular.utils import extend_schema
from rest_framework import status, views
from rest_framework.exceptions import NotFound

from apps.common.responses import CustomResponse
from apps.groups import selectors, services
from apps.groups.permissions import GroupMembershipAdminPermission, GroupsAdminPermission
from apps.groups.serializers import (
    GroupDetailSerializer,
    GroupListSerializer,
    GroupMembershipCreateSerializer,
    GroupMembershipDetailSerializer,
    GroupMembershipUpdateSerializer,
    GroupWriteSerializer,
)
from apps.members import selectors as member_selectors


def _parse_bool(value: str | None):
    if value is None:
        return None
    return value.lower() in {"1", "true", "yes", "on"}


class GroupListCreateAdminApi(views.APIView):
    permission_classes = [GroupsAdminPermission]

    @extend_schema(
        tags=["Admin - Groups"],
        summary="List groups",
        responses=GroupListSerializer(many=True),
    )
    def get(self, request):
        groups = selectors.list_groups(
            filters={
                "search": request.query_params.get("search"),
                "is_active": _parse_bool(request.query_params.get("is_active")),
            }
        )
        serializer = GroupListSerializer(groups, many=True)
        return CustomResponse(data=serializer.data, message="Groups fetched successfully.")

    @extend_schema(
        tags=["Admin - Groups"],
        summary="Create group",
        request=GroupWriteSerializer,
        responses=GroupDetailSerializer,
    )
    def post(self, request):
        serializer = GroupWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        group = services.create_group(data=serializer.validated_data, actor=request.user)
        response_serializer = GroupDetailSerializer(group)
        return CustomResponse(
            data=response_serializer.data,
            message="Group created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class GroupDetailAdminApi(views.APIView):
    permission_classes = [GroupsAdminPermission]

    @extend_schema(
        tags=["Admin - Groups"],
        summary="Retrieve group detail",
        responses=GroupDetailSerializer,
    )
    def get(self, request, group_id: int):
        group = selectors.get_group_detail_with_members(group_id=group_id)
        if group is None:
            raise NotFound("Group not found.")

        serializer = GroupDetailSerializer(group)
        return CustomResponse(data=serializer.data, message="Group fetched successfully.")

    @extend_schema(
        tags=["Admin - Groups"],
        summary="Update group",
        request=GroupWriteSerializer,
        responses=GroupDetailSerializer,
    )
    def patch(self, request, group_id: int):
        group = selectors.get_group_by_id(group_id=group_id)
        if group is None:
            raise NotFound("Group not found.")

        serializer = GroupWriteSerializer(group, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        group = services.update_group(group=group, data=serializer.validated_data, actor=request.user)
        group = selectors.get_group_detail_with_members(group_id=group.id)
        response_serializer = GroupDetailSerializer(group)
        return CustomResponse(
            data=response_serializer.data,
            message="Group updated successfully.",
        )


class GroupMembershipCreateAdminApi(views.APIView):
    permission_classes = [GroupMembershipAdminPermission]

    @extend_schema(
        tags=["Admin - Groups"],
        summary="Add member to group",
        request=GroupMembershipCreateSerializer,
        responses=GroupDetailSerializer,
    )
    def post(self, request, group_id: int):
        group = selectors.get_group_by_id(group_id=group_id)
        if group is None:
            raise NotFound("Group not found.")

        serializer = GroupMembershipCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        member = member_selectors.get_member_by_id(member_id=serializer.validated_data["member_id"])
        if member is None:
            raise NotFound("Member not found.")

        services.add_member_to_group(
            group=group,
            member=member,
            role_name=serializer.validated_data.get("role_name", ""),
            started_on=serializer.validated_data.get("started_on"),
            notes=serializer.validated_data.get("notes", ""),
            actor=request.user,
        )

        group = selectors.get_group_detail_with_members(group_id=group.id)
        response_serializer = GroupDetailSerializer(group)
        return CustomResponse(
            data=response_serializer.data,
            message="Member added to group successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class GroupMembershipDetailAdminApi(views.APIView):
    permission_classes = [GroupMembershipAdminPermission]

    @extend_schema(
        tags=["Admin - Groups"],
        summary="Update group membership",
        request=GroupMembershipUpdateSerializer,
        responses=GroupMembershipDetailSerializer,
    )
    def patch(self, request, group_id: int, membership_id: int):
        membership = selectors.list_group_memberships(
            filters={"group_id": group_id}
        ).filter(id=membership_id).first()
        if membership is None:
            raise NotFound("Group membership not found.")

        serializer = GroupMembershipUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        membership = services.update_group_membership(
            membership=membership,
            data=serializer.validated_data,
            actor=request.user,
        )
        response_serializer = GroupMembershipDetailSerializer(membership)
        return CustomResponse(
            data=response_serializer.data,
            message="Group membership updated successfully.",
        )
