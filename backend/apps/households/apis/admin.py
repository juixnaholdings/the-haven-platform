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
    HouseholdMembershipCreateSerializer,
    HouseholdWriteSerializer,
)
from apps.members import selectors as member_selectors


def _parse_bool(value: str | None):
    if value is None:
        return None
    return value.lower() in {"1", "true", "yes", "on"}


class HouseholdListCreateAdminApi(views.APIView):
    permission_classes = [HouseholdsAdminPermission]

    @extend_schema(
        tags=["Admin - Households"],
        summary="List households",
        responses=HouseholdListSerializer(many=True),
    )
    def get(self, request):
        households = selectors.list_households(
            filters={
                "search": request.query_params.get("search"),
                "is_active": _parse_bool(request.query_params.get("is_active")),
            }
        )
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
