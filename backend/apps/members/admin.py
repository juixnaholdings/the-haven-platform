from django.contrib import admin

from apps.members.models import Member


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ("full_name", "email", "phone_number", "is_active", "updated_at")
    search_fields = ("first_name", "middle_name", "last_name", "email", "phone_number")
    list_filter = ("is_active",)
    ordering = ("last_name", "first_name", "id")
