from django.db import connections
from django.db.models import QuerySet

from apps.common.models import AuditEvent


def get_health_status():
    with connections["default"].cursor() as cursor:
        cursor.execute("SELECT 1")
        cursor.fetchone()

    return {
        "status": "ok",
        "database": "ok",
    }


def list_audit_events(*, filters: dict | None = None) -> QuerySet[AuditEvent]:
    filters = filters or {}
    queryset = AuditEvent.objects.select_related("actor").all()

    if filters.get("event_type"):
        queryset = queryset.filter(event_type=filters["event_type"])

    if filters.get("target_type"):
        queryset = queryset.filter(target_type=filters["target_type"])

    if filters.get("target_id") is not None:
        queryset = queryset.filter(target_id=filters["target_id"])

    if filters.get("actor_id") is not None:
        queryset = queryset.filter(actor_id=filters["actor_id"])

    if filters.get("start_date"):
        queryset = queryset.filter(created_at__date__gte=filters["start_date"])

    if filters.get("end_date"):
        queryset = queryset.filter(created_at__date__lte=filters["end_date"])

    return queryset.order_by("-created_at", "-id")


def get_audit_event_by_id(*, audit_event_id: int) -> AuditEvent | None:
    return (
        AuditEvent.objects.select_related("actor")
        .filter(id=audit_event_id)
        .first()
    )
