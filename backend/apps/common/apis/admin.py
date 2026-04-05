from drf_spectacular.utils import extend_schema
from rest_framework import views
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated

from apps.common.pagination import get_optional_paginated_response
from apps.common.permissions import AuditTrailAdminPermission
from apps.common.responses import CustomResponse
from apps.common.serializers import (
    AuditEventFilterSerializer,
    AuditEventListSerializer,
    OpsNotificationFeedSerializer,
)
from apps.common import selectors


def _get_validated_filters(query_params):
    serializer = AuditEventFilterSerializer(data=query_params.dict())
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


class AuditEventListAdminApi(views.APIView):
    permission_classes = [AuditTrailAdminPermission]

    @extend_schema(
        tags=["Admin - Audit"],
        summary="List audit events",
        description=(
            "Supports optional pagination. Provide `page` or `page_size` query params "
            "to receive a paginated payload."
        ),
        parameters=[AuditEventFilterSerializer],
        responses=AuditEventListSerializer(many=True),
    )
    def get(self, request):
        events = selectors.list_audit_events(filters=_get_validated_filters(request.query_params))
        paginated_response = get_optional_paginated_response(
            request=request,
            queryset=events,
            serializer_class=AuditEventListSerializer,
            message="Audit events fetched successfully.",
        )
        if paginated_response is not None:
            return paginated_response

        serializer = AuditEventListSerializer(events, many=True)
        return CustomResponse(data=serializer.data, message="Audit events fetched successfully.")


class AuditEventDetailAdminApi(views.APIView):
    permission_classes = [AuditTrailAdminPermission]

    @extend_schema(
        tags=["Admin - Audit"],
        summary="Retrieve audit event",
        responses=AuditEventListSerializer,
    )
    def get(self, request, audit_event_id: int):
        audit_event = selectors.get_audit_event_by_id(audit_event_id=audit_event_id)
        if audit_event is None:
            raise NotFound("Audit event not found.")

        serializer = AuditEventListSerializer(audit_event)
        return CustomResponse(
            data=serializer.data,
            message="Audit event fetched successfully.",
        )


class OpsNotificationFeedApi(views.APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Admin - Ops"],
        summary="Get in-app operational notifications",
        responses=OpsNotificationFeedSerializer,
    )
    def get(self, request):
        data = selectors.get_ops_notification_feed(user=request.user)
        serializer = OpsNotificationFeedSerializer(data)
        return CustomResponse(
            data=serializer.data,
            message="Operational notifications fetched successfully.",
        )
