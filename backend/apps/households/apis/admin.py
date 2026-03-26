from drf_spectacular.utils import extend_schema
from rest_framework import status, views
from rest_framework.exceptions import NotFound

from apps.common.responses import CustomResponse
from apps.households import selectors, services
from apps.households.permissions import (
    HouseholdMembershipAdminPermission,
    HouseholdsAdminPermission,
)
from apps.households.serializers import (
    HouseholdDetailSerializer,
    HouseholdListSerializer,
    HouseholdListFilterSerializer,
    HouseholdMembershipCreateSerializer,
    HouseholdMemberDetailSerializer,
    HouseholdMembershipUpdateSerializer,
    HouseholdWriteSerializer,
)
from apps.members import selectors as member_selectors

def _get_validated_filters(query_params):
    serializer = HouseholdListFilterSerializer(data=query_params.dict())
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


class HouseholdListCreateAdminApi(views.APIView):
    permission_classes = [HouseholdsAdminPermission]

    @extend_schema(
        tags=["Admin - Households"],
        summary="List households",
        parameters=[HouseholdListFilterSerializer],
        responses=HouseholdListSerializer(many=True),
    )
    def get(self, request):
        households = selectors.list_households(filters=_get_validated_filters(request.query_params))
        serializer = HouseholdListSerializer(households, many=True)
        return CustomResponse(data=serializer.data, message="Households fetched successfully.")

    @extend_schema(
        tags=["Admin - Households"],
        summary="Create household",
        request=HouseholdWriteSerializer,
        responses=HouseholdDetailSerializer,
    )
    def post(self, request):
        serializer = HouseholdWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        household = services.create_household(data=serializer.validated_data, actor=request.user)
        response_serializer = HouseholdDetailSerializer(household)
        return CustomResponse(
            data=response_serializer.data,
            message="Household created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class HouseholdDetailAdminApi(views.APIView):
    permission_classes = [HouseholdsAdminPermission]

    @extend_schema(
        tags=["Admin - Households"],
        summary="Retrieve household detail",
        responses=HouseholdDetailSerializer,
    )
    def get(self, request, household_id: int):
        household = selectors.get_household_detail_with_members(household_id=household_id)
        if household is None:
            raise NotFound("Household not found.")

        serializer = HouseholdDetailSerializer(household)
        return CustomResponse(data=serializer.data, message="Household fetched successfully.")

    @extend_schema(
        tags=["Admin - Households"],
        summary="Update household",
        request=HouseholdWriteSerializer,
        responses=HouseholdDetailSerializer,
    )
    def patch(self, request, household_id: int):
        household = selectors.get_household_by_id(household_id=household_id)
        if household is None:
            raise NotFound("Household not found.")

        serializer = HouseholdWriteSerializer(household, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        household = services.update_household(
            household=household,
            data=serializer.validated_data,
            actor=request.user,
        )
        household = selectors.get_household_detail_with_members(household_id=household.id)
        response_serializer = HouseholdDetailSerializer(household)
        return CustomResponse(
            data=response_serializer.data,
            message="Household updated successfully.",
        )


class HouseholdMemberCreateAdminApi(views.APIView):
    permission_classes = [HouseholdMembershipAdminPermission]

    @extend_schema(
        tags=["Admin - Households"],
        summary="Add member to household",
        request=HouseholdMembershipCreateSerializer,
        responses=HouseholdDetailSerializer,
    )
    def post(self, request, household_id: int):
        household = selectors.get_household_by_id(household_id=household_id)
        if household is None:
            raise NotFound("Household not found.")

        serializer = HouseholdMembershipCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        member = member_selectors.get_member_by_id(
            member_id=serializer.validated_data["member_id"]
        )
        if member is None:
            raise NotFound("Member not found.")

        services.add_member_to_household(
            household=household,
            member=member,
            relationship_to_head=serializer.validated_data["relationship_to_head"],
            is_head=serializer.validated_data["is_head"],
            joined_on=serializer.validated_data.get("joined_on"),
            left_on=serializer.validated_data.get("left_on"),
            notes=serializer.validated_data.get("notes", ""),
            actor=request.user,
        )

        household = selectors.get_household_detail_with_members(household_id=household.id)
        response_serializer = HouseholdDetailSerializer(household)
        return CustomResponse(
            data=response_serializer.data,
            message="Member added to household successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class HouseholdMembershipDetailAdminApi(views.APIView):
    permission_classes = [HouseholdMembershipAdminPermission]

    @extend_schema(
        tags=["Admin - Households"],
        summary="Update household membership",
        request=HouseholdMembershipUpdateSerializer,
        responses=HouseholdMemberDetailSerializer,
    )
    def patch(self, request, household_id: int, membership_id: int):
        membership = selectors.get_household_membership_by_id(
            household_id=household_id,
            membership_id=membership_id,
        )
        if membership is None:
            raise NotFound("Household membership not found.")

        serializer = HouseholdMembershipUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        membership = services.update_household_membership(
            membership=membership,
            data=serializer.validated_data,
            actor=request.user,
        )
        response_serializer = HouseholdMemberDetailSerializer(membership)
        return CustomResponse(
            data=response_serializer.data,
            message="Household membership updated successfully.",
        )
