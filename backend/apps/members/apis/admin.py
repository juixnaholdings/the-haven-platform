from drf_spectacular.utils import extend_schema
from rest_framework import status, views
from rest_framework.exceptions import NotFound

from apps.common.responses import CustomResponse
from apps.members import selectors, services
from apps.members.permissions import MembersAdminPermission
from apps.members.serializers import (
    MemberDetailSerializer,
    MemberListFilterSerializer,
    MemberListSerializer,
    MemberWriteSerializer,
)

def _get_validated_filters(query_params):
    serializer = MemberListFilterSerializer(data=query_params.dict())
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


class MemberListCreateAdminApi(views.APIView):
    permission_classes = [MembersAdminPermission]

    @extend_schema(
        tags=["Admin - Members"],
        summary="List members",
        parameters=[MemberListFilterSerializer],
        responses=MemberListSerializer(many=True),
    )
    def get(self, request):
        members = selectors.list_members(filters=_get_validated_filters(request.query_params))
        serializer = MemberListSerializer(members, many=True)
        return CustomResponse(data=serializer.data, message="Members fetched successfully.")

    @extend_schema(
        tags=["Admin - Members"],
        summary="Create member",
        request=MemberWriteSerializer,
        responses=MemberDetailSerializer,
    )
    def post(self, request):
        serializer = MemberWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        member = services.create_member(data=serializer.validated_data, actor=request.user)
        response_serializer = MemberDetailSerializer(member)
        return CustomResponse(
            data=response_serializer.data,
            message="Member created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class MemberDetailAdminApi(views.APIView):
    permission_classes = [MembersAdminPermission]

    @extend_schema(
        tags=["Admin - Members"],
        summary="Retrieve member",
        responses=MemberDetailSerializer,
    )
    def get(self, request, member_id: int):
        member = selectors.get_member_by_id(member_id=member_id)
        if member is None:
            raise NotFound("Member not found.")

        serializer = MemberDetailSerializer(member)
        return CustomResponse(data=serializer.data, message="Member fetched successfully.")

    @extend_schema(
        tags=["Admin - Members"],
        summary="Update member",
        request=MemberWriteSerializer,
        responses=MemberDetailSerializer,
    )
    def patch(self, request, member_id: int):
        member = selectors.get_member_by_id(member_id=member_id)
        if member is None:
            raise NotFound("Member not found.")

        serializer = MemberWriteSerializer(member, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        member = services.update_member(
            member=member,
            data=serializer.validated_data,
            actor=request.user,
        )
        response_serializer = MemberDetailSerializer(member)
        return CustomResponse(data=response_serializer.data, message="Member updated successfully.")
