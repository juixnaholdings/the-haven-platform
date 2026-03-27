from drf_spectacular.utils import extend_schema
from rest_framework import status, views
from rest_framework.exceptions import NotFound

from apps.attendance import selectors, services
from apps.attendance.permissions import (
    AttendanceSummaryAdminPermission,
    MemberAttendanceAdminPermission,
    ServiceEventAdminPermission,
)
from apps.attendance.serializers import (
    AttendanceSummaryWriteSerializer,
    MemberAttendanceCreateSerializer,
    MemberAttendanceDetailSerializer,
    MemberAttendanceListFilterSerializer,
    MemberAttendanceUpdateSerializer,
    ServiceEventDetailSerializer,
    ServiceEventListFilterSerializer,
    ServiceEventListSerializer,
    ServiceEventWriteSerializer,
)
from apps.common.responses import CustomResponse
from apps.common.pagination import get_optional_paginated_response
from apps.members import selectors as member_selectors

def _get_service_event_filters(query_params):
    serializer = ServiceEventListFilterSerializer(data=query_params.dict())
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def _get_member_attendance_filters(query_params):
    serializer = MemberAttendanceListFilterSerializer(data=query_params.dict())
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


class ServiceEventListCreateAdminApi(views.APIView):
    permission_classes = [ServiceEventAdminPermission]

    @extend_schema(
        tags=["Admin - Attendance"],
        summary="List service events",
        description=(
            "Supports optional pagination. Provide `page` or `page_size` query params "
            "to receive a paginated payload."
        ),
        parameters=[ServiceEventListFilterSerializer],
        responses=ServiceEventListSerializer(many=True),
    )
    def get(self, request):
        service_events = selectors.list_service_events(
            filters=_get_service_event_filters(request.query_params)
        )
        paginated_response = get_optional_paginated_response(
            request=request,
            queryset=service_events,
            serializer_class=ServiceEventListSerializer,
            message="Service events fetched successfully.",
        )
        if paginated_response is not None:
            return paginated_response

        serializer = ServiceEventListSerializer(service_events, many=True)
        return CustomResponse(
            data=serializer.data,
            message="Service events fetched successfully.",
        )

    @extend_schema(
        tags=["Admin - Attendance"],
        summary="Create service event",
        request=ServiceEventWriteSerializer,
        responses=ServiceEventDetailSerializer,
    )
    def post(self, request):
        serializer = ServiceEventWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service_event = services.create_service_event(
            data=serializer.validated_data,
            actor=request.user,
        )
        response_serializer = ServiceEventDetailSerializer(service_event)
        return CustomResponse(
            data=response_serializer.data,
            message="Service event created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class ServiceEventDetailAdminApi(views.APIView):
    permission_classes = [ServiceEventAdminPermission]

    @extend_schema(
        tags=["Admin - Attendance"],
        summary="Retrieve service event detail",
        responses=ServiceEventDetailSerializer,
    )
    def get(self, request, service_event_id: int):
        service_event = selectors.get_service_event_detail(service_event_id=service_event_id)
        if service_event is None:
            raise NotFound("Service event not found.")

        serializer = ServiceEventDetailSerializer(service_event)
        return CustomResponse(
            data=serializer.data,
            message="Service event fetched successfully.",
        )

    @extend_schema(
        tags=["Admin - Attendance"],
        summary="Update service event",
        request=ServiceEventWriteSerializer,
        responses=ServiceEventDetailSerializer,
    )
    def patch(self, request, service_event_id: int):
        service_event = selectors.get_service_event_by_id(service_event_id=service_event_id)
        if service_event is None:
            raise NotFound("Service event not found.")

        serializer = ServiceEventWriteSerializer(service_event, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        service_event = services.update_service_event(
            service_event=service_event,
            data=serializer.validated_data,
            actor=request.user,
        )
        service_event = selectors.get_service_event_detail(service_event_id=service_event.id)
        response_serializer = ServiceEventDetailSerializer(service_event)
        return CustomResponse(
            data=response_serializer.data,
            message="Service event updated successfully.",
        )


class AttendanceSummaryAdminApi(views.APIView):
    permission_classes = [AttendanceSummaryAdminPermission]

    @extend_schema(
        tags=["Admin - Attendance"],
        summary="Create or update attendance summary",
        request=AttendanceSummaryWriteSerializer,
        responses=ServiceEventDetailSerializer,
    )
    def put(self, request, service_event_id: int):
        return self._upsert_summary(request, service_event_id=service_event_id, partial=False)

    @extend_schema(
        tags=["Admin - Attendance"],
        summary="Partially update attendance summary",
        request=AttendanceSummaryWriteSerializer,
        responses=ServiceEventDetailSerializer,
    )
    def patch(self, request, service_event_id: int):
        return self._upsert_summary(request, service_event_id=service_event_id, partial=True)

    def _upsert_summary(self, request, *, service_event_id: int, partial: bool):
        service_event = selectors.get_service_event_by_id(service_event_id=service_event_id)
        if service_event is None:
            raise NotFound("Service event not found.")

        serializer = AttendanceSummaryWriteSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        services.create_or_update_attendance_summary(
            service_event=service_event,
            data=serializer.validated_data,
            actor=request.user,
        )
        service_event = selectors.get_service_event_detail(service_event_id=service_event.id)
        response_serializer = ServiceEventDetailSerializer(service_event)
        return CustomResponse(
            data=response_serializer.data,
            message="Attendance summary saved successfully.",
        )


class MemberAttendanceListCreateAdminApi(views.APIView):
    permission_classes = [MemberAttendanceAdminPermission]

    @extend_schema(
        tags=["Admin - Attendance"],
        summary="List member attendance records for an event",
        description=(
            "Supports optional pagination. Provide `page` or `page_size` query params "
            "to receive a paginated payload."
        ),
        parameters=[MemberAttendanceListFilterSerializer],
        responses=MemberAttendanceDetailSerializer(many=True),
    )
    def get(self, request, service_event_id: int):
        service_event = selectors.get_service_event_by_id(service_event_id=service_event_id)
        if service_event is None:
            raise NotFound("Service event not found.")

        member_attendances = selectors.list_member_attendance_for_event(
            service_event_id=service_event_id,
            filters=_get_member_attendance_filters(request.query_params),
        )
        paginated_response = get_optional_paginated_response(
            request=request,
            queryset=member_attendances,
            serializer_class=MemberAttendanceDetailSerializer,
            message="Member attendance records fetched successfully.",
        )
        if paginated_response is not None:
            return paginated_response

        serializer = MemberAttendanceDetailSerializer(member_attendances, many=True)
        return CustomResponse(
            data=serializer.data,
            message="Member attendance records fetched successfully.",
        )

    @extend_schema(
        tags=["Admin - Attendance"],
        summary="Record member attendance for an event",
        request=MemberAttendanceCreateSerializer,
        responses=ServiceEventDetailSerializer,
    )
    def post(self, request, service_event_id: int):
        service_event = selectors.get_service_event_by_id(service_event_id=service_event_id)
        if service_event is None:
            raise NotFound("Service event not found.")

        serializer = MemberAttendanceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        member = member_selectors.get_member_by_id(
            member_id=serializer.validated_data["member_id"]
        )
        if member is None:
            raise NotFound("Member not found.")

        services.record_member_attendance(
            service_event=service_event,
            member=member,
            status=serializer.validated_data["status"],
            checked_in_at=serializer.validated_data.get("checked_in_at"),
            notes=serializer.validated_data.get("notes", ""),
            actor=request.user,
        )
        service_event = selectors.get_service_event_detail(service_event_id=service_event.id)
        response_serializer = ServiceEventDetailSerializer(service_event)
        return CustomResponse(
            data=response_serializer.data,
            message="Member attendance recorded successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class MemberAttendanceDetailAdminApi(views.APIView):
    permission_classes = [MemberAttendanceAdminPermission]

    @extend_schema(
        tags=["Admin - Attendance"],
        summary="Update member attendance",
        request=MemberAttendanceUpdateSerializer,
        responses=MemberAttendanceDetailSerializer,
    )
    def patch(self, request, service_event_id: int, member_attendance_id: int):
        member_attendance = selectors.get_member_attendance_by_id(
            member_attendance_id=member_attendance_id,
            service_event_id=service_event_id,
        )
        if member_attendance is None:
            raise NotFound("Member attendance record not found.")

        serializer = MemberAttendanceUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        member_attendance = services.update_member_attendance(
            member_attendance=member_attendance,
            data=serializer.validated_data,
            actor=request.user,
        )
        response_serializer = MemberAttendanceDetailSerializer(member_attendance)
        return CustomResponse(
            data=response_serializer.data,
            message="Member attendance updated successfully.",
        )
