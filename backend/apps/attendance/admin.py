from django.contrib import admin

from apps.attendance.models import AttendanceSummary, MemberAttendance, ServiceEvent


@admin.register(ServiceEvent)
class ServiceEventAdmin(admin.ModelAdmin):
    list_display = ("title", "event_type", "service_date", "start_time", "location", "is_active")
    list_filter = ("event_type", "service_date", "is_active")
    search_fields = ("title", "location", "notes")
    ordering = ("-service_date", "start_time", "title")
    date_hierarchy = "service_date"
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")


@admin.register(AttendanceSummary)
class AttendanceSummaryAdmin(admin.ModelAdmin):
    list_display = ("service_event", "total_count", "visitor_count", "updated_at")
    search_fields = ("service_event__title", "service_event__location", "notes")
    autocomplete_fields = ("service_event",)
    list_select_related = ("service_event",)
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")


@admin.register(MemberAttendance)
class MemberAttendanceAdmin(admin.ModelAdmin):
    list_display = ("service_event", "member", "status", "checked_in_at", "updated_at")
    list_filter = ("status", "service_event__event_type")
    search_fields = (
        "service_event__title",
        "member__first_name",
        "member__middle_name",
        "member__last_name",
        "member__email",
        "notes",
    )
    autocomplete_fields = ("service_event", "member")
    list_select_related = ("service_event", "member")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")
