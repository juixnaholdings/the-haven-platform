from django.contrib import admin

from apps.groups.models import Group, GroupMembership


class GroupMembershipInline(admin.TabularInline):
    model = GroupMembership
    extra = 0
    autocomplete_fields = ("member",)


@admin.register(Group)
class GroupAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "updated_at")
    search_fields = ("name", "description")
    list_filter = ("is_active",)
    inlines = (GroupMembershipInline,)


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ("group", "member", "role_name", "is_active", "started_on", "ended_on")
    list_filter = ("is_active",)
    search_fields = ("group__name", "member__first_name", "member__last_name", "role_name")
    autocomplete_fields = ("group", "member")
