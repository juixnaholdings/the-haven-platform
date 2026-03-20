from django.contrib import admin

from apps.households.models import Household, HouseholdMembership


class HouseholdMembershipInline(admin.TabularInline):
    model = HouseholdMembership
    extra = 0
    autocomplete_fields = ("member",)
    show_change_link = True


@admin.register(Household)
class HouseholdAdmin(admin.ModelAdmin):
    list_display = ("name", "primary_phone", "city", "is_active", "updated_at")
    search_fields = ("name", "primary_phone", "address_line_1", "address_line_2", "city")
    list_filter = ("is_active",)
    inlines = (HouseholdMembershipInline,)
    ordering = ("name", "id")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")


@admin.register(HouseholdMembership)
class HouseholdMembershipAdmin(admin.ModelAdmin):
    list_display = ("household", "member", "relationship_to_head", "is_head", "is_active")
    list_filter = ("is_head", "is_active", "relationship_to_head")
    search_fields = ("household__name", "member__first_name", "member__last_name")
    autocomplete_fields = ("household", "member")
    list_select_related = ("household", "member")
    ordering = ("household__name", "-is_head", "member__last_name", "member__first_name", "id")
    readonly_fields = ("created_at", "updated_at", "created_by", "updated_by")
