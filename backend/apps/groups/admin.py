from django.contrib import admin

from apps.groups.models import Group, GroupMembership


class GroupMembershipInline(admin.TabularInline):
    model = GroupMembership
    extra = 0
    autocomplete_fields = ("member",)
    show_change_link = True


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "updated_at")
    search_fields = ("name", "description")
    list_filter = ("is_active",)
    inlines = (GroupMembershipInline,)
    ordering = ("name", "id")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ("group", "member", "role_name", "is_active", "started_on", "ended_on")
    list_filter = ("is_active",)
    search_fields = ("group__name", "member__first_name", "member__last_name", "role_name")
    autocomplete_fields = ("group", "member")
    list_select_related = ("group", "member")
    ordering = ("group__name", "-is_active", "member__last_name", "member__first_name", "id")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")
