from django.contrib import admin

from apps.common.models import AuditEvent


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin):
    list_display = ("id", "event_type", "target_type", "target_id", "actor", "created_at")
    list_filter = ("event_type", "target_type", "created_at")
    search_fields = (
        "summary",
        "event_type",
        "target_type",
        "actor__username",
        "actor__first_name",
        "actor__last_name",
    )
    ordering = ("-created_at", "-id")
