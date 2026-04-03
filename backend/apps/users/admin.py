from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from apps.users.models import StaffInvite, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = (
        "username",
        "email",
        "first_name",
        "last_name",
        "group_names",
        "is_staff",
        "is_active",
    )
    search_fields = ("username", "email", "first_name", "last_name")
    list_filter = ("is_staff", "is_superuser", "is_active", "groups")
    filter_horizontal = ("groups", "user_permissions")
    ordering = ("username",)
    readonly_fields = ("last_login", "date_joined")

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("groups")

    @admin.display(description="Groups")
    def group_names(self, obj):
        group_names = [group.name for group in obj.groups.all()]
        return ", ".join(group_names) if group_names else "-"


@admin.register(StaffInvite)
class StaffInviteAdmin(admin.ModelAdmin):
    list_display = (
        "email",
        "status",
        "expires_at",
        "accepted_at",
        "accepted_user",
        "created_at",
    )
    search_fields = ("email", "accepted_user__username", "accepted_user__email", "token")
    list_filter = ("status", "expires_at", "created_at")
    autocomplete_fields = ("accepted_user", "role_groups", "created_by", "updated_by")
    filter_horizontal = ("role_groups",)
    ordering = ("-created_at",)
