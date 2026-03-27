from collections.abc import Mapping

from apps.common.models import AuditEvent


def log_audit_event(
    *,
    event_type: str,
    target_type: str,
    summary: str,
    actor=None,
    target_id: int | None = None,
    payload: Mapping | None = None,
) -> AuditEvent:
    normalized_payload = dict(payload) if payload else {}

    return AuditEvent.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        event_type=event_type,
        target_type=target_type,
        target_id=target_id,
        summary=summary.strip(),
        payload=normalized_payload,
    )
