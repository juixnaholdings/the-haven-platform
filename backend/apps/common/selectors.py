from datetime import timedelta

from django.db import connections
from django.db.models import Q, QuerySet
from django.utils import timezone

from apps.attendance.models import ServiceEvent
from apps.common.audit import AuditEventType
from apps.common.models import AuditEvent
from apps.users.constants import (
    ATTENDANCE_OFFICER_ROLE,
    CHURCH_ADMIN_ROLE,
    FINANCE_SECRETARY_ROLE,
    LEADERSHIP_VIEWER_ROLE,
    SUPER_ADMIN_ROLE,
)
from apps.users.models import StaffInvite, StaffInviteStatus
from apps.users.selectors import user_has_any_role


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

    search = filters.get("search")
    if search:
        queryset = queryset.filter(
            Q(summary__icontains=search)
            | Q(event_type__icontains=search)
            | Q(target_type__icontains=search)
            | Q(actor__username__icontains=search)
            | Q(actor__first_name__icontains=search)
            | Q(actor__last_name__icontains=search)
        )

    if filters.get("event_type"):
        queryset = queryset.filter(event_type=filters["event_type"])

    if filters.get("target_type"):
        queryset = queryset.filter(target_type=filters["target_type"])

    if filters.get("target_id") is not None:
        queryset = queryset.filter(target_id=filters["target_id"])

    if filters.get("actor_id") is not None:
        queryset = queryset.filter(actor_id=filters["actor_id"])

    if filters.get("actor_username"):
        queryset = queryset.filter(actor__username__icontains=filters["actor_username"])

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


def _can_view_staff_lifecycle(*, user) -> bool:
    if user.is_superuser:
        return True

    if user_has_any_role(
        user=user,
        role_names=(SUPER_ADMIN_ROLE, CHURCH_ADMIN_ROLE),
    ):
        return True

    return bool(user.is_staff and user.has_perm("users.view_user"))


def _can_view_attendance_ops(*, user) -> bool:
    if user.is_superuser:
        return True

    if user_has_any_role(
        user=user,
        role_names=(SUPER_ADMIN_ROLE, CHURCH_ADMIN_ROLE, ATTENDANCE_OFFICER_ROLE, LEADERSHIP_VIEWER_ROLE),
    ):
        return True

    return bool(user.is_staff and user.has_perm("attendance.view_serviceevent"))


def _can_view_finance_ops(*, user) -> bool:
    if user.is_superuser:
        return True

    if user_has_any_role(
        user=user,
        role_names=(SUPER_ADMIN_ROLE, CHURCH_ADMIN_ROLE, FINANCE_SECRETARY_ROLE, LEADERSHIP_VIEWER_ROLE),
    ):
        return True

    return bool(user.is_staff and user.has_perm("finance.view_transaction"))


def get_ops_notification_feed(*, user, limit: int = 8) -> dict:
    now = timezone.now()
    today = timezone.localdate()
    notifications: list[dict] = []

    if _can_view_staff_lifecycle(user=user):
        pending_invites = StaffInvite.objects.filter(
            status=StaffInviteStatus.PENDING,
            expires_at__gte=now,
        )
        pending_invite_count = pending_invites.count()
        if pending_invite_count:
            soonest_invite = pending_invites.order_by("expires_at", "id").first()
            notifications.append(
                {
                    "id": "staff-invites-pending",
                    "kind": "STAFF_INVITES_PENDING",
                    "severity": "warning",
                    "title": f"{pending_invite_count} pending staff invite"
                    + ("" if pending_invite_count == 1 else "s"),
                    "description": (
                        f"Oldest pending invite expires on {soonest_invite.expires_at:%b %d, %Y}."
                        if soonest_invite
                        else "Pending invites need follow-up."
                    ),
                    "href": "/settings/staff",
                    "created_at": soonest_invite.created_at if soonest_invite else None,
                }
            )

    if _can_view_attendance_ops(user=user):
        missing_summary_qs = ServiceEvent.objects.filter(
            is_active=True,
            service_date__lte=today,
            service_date__gte=today - timedelta(days=14),
            attendance_summary__isnull=True,
        ).order_by("-service_date", "-id")
        missing_summary_count = missing_summary_qs.count()
        if missing_summary_count:
            follow_up_event = missing_summary_qs.first()
            notifications.append(
                {
                    "id": "attendance-missing-summary",
                    "kind": "ATTENDANCE_MISSING_SUMMARY",
                    "severity": "danger",
                    "title": f"{missing_summary_count} event"
                    + ("" if missing_summary_count == 1 else "s")
                    + " need attendance capture",
                    "description": (
                        f"Follow up with {follow_up_event.title} ({follow_up_event.service_date})."
                        if follow_up_event
                        else "Recent active events still need attendance capture."
                    ),
                    "href": f"/events/{follow_up_event.id}/attendance" if follow_up_event else "/attendance",
                    "created_at": follow_up_event.updated_at if follow_up_event else None,
                }
            )

        next_event = (
            ServiceEvent.objects.filter(
                is_active=True,
                service_date__gte=today,
                service_date__lte=today + timedelta(days=14),
            )
            .order_by("service_date", "start_time", "id")
            .first()
        )
        if next_event:
            notifications.append(
                {
                    "id": "attendance-upcoming-event",
                    "kind": "UPCOMING_EVENT",
                    "severity": "info",
                    "title": "Upcoming event reminder",
                    "description": f"{next_event.title} is scheduled for {next_event.service_date}.",
                    "href": f"/events/{next_event.id}",
                    "created_at": next_event.updated_at,
                }
            )

    if _can_view_finance_ops(user=user):
        recent_finance_action = (
            AuditEvent.objects.filter(
                actor=user,
                event_type__in=(
                    AuditEventType.FINANCE_TRANSACTION_CREATED,
                    AuditEventType.FINANCE_TRANSACTION_UPDATED,
                ),
                created_at__gte=now - timedelta(hours=24),
            )
            .order_by("-created_at", "-id")
            .first()
        )
        if recent_finance_action:
            notifications.append(
                {
                    "id": f"finance-action-{recent_finance_action.id}",
                    "kind": "FINANCE_ACTION_CONFIRMATION",
                    "severity": "success",
                    "title": "Finance action recorded",
                    "description": recent_finance_action.summary,
                    "href": "/finance",
                    "created_at": recent_finance_action.created_at,
                }
            )

    severity_priority = {"danger": 0, "warning": 1, "info": 2, "success": 3}
    ordered_notifications = sorted(
        notifications,
        key=lambda notification: (
            severity_priority.get(notification.get("severity", "info"), 9),
            -notification["created_at"].timestamp() if notification.get("created_at") else 0,
        ),
    )[:limit]

    return {
        "generated_at": now,
        "notification_count": len(ordered_notifications),
        "unread_count": len(ordered_notifications),
        "notifications": ordered_notifications,
    }
