from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class AuditModel(TimeStampedModel):
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_updated",
    )

    class Meta:
        abstract = True


class AuditEvent(TimeStampedModel):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_events",
    )
    event_type = models.CharField(max_length=100, db_index=True)
    target_type = models.CharField(max_length=64, db_index=True)
    target_id = models.PositiveBigIntegerField(null=True, blank=True, db_index=True)
    summary = models.CharField(max_length=255)
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ("-created_at", "-id")
        indexes = [
            models.Index(fields=["event_type", "created_at"]),
            models.Index(fields=["target_type", "target_id", "created_at"]),
            models.Index(fields=["actor", "created_at"]),
        ]

    def __str__(self):
        return f"{self.event_type} [{self.target_type}:{self.target_id or '-'}]"
