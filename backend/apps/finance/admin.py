from django.contrib import admin

from apps.finance.models import FundAccount, Transaction, TransactionLine


class TransactionLineInline(admin.TabularInline):
    model = TransactionLine
    extra = 0
    can_delete = False
    fields = ("fund_account", "direction", "amount", "category_name", "notes")
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(FundAccount)
class FundAccountAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "is_active", "updated_at")
    search_fields = ("name", "code", "description")
    list_filter = ("is_active",)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("reference_no", "transaction_type", "transaction_date", "service_event", "posted_at")
    list_filter = ("transaction_type", "transaction_date")
    search_fields = ("reference_no", "description", "service_event__title")
    autocomplete_fields = ("service_event",)
    inlines = (TransactionLineInline,)
    readonly_fields = (
        "reference_no",
        "transaction_type",
        "transaction_date",
        "description",
        "service_event",
        "posted_at",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(TransactionLine)
class TransactionLineAdmin(admin.ModelAdmin):
    list_display = ("transaction", "fund_account", "direction", "amount", "category_name")
    list_filter = ("direction",)
    search_fields = (
        "transaction__reference_no",
        "fund_account__name",
        "fund_account__code",
        "category_name",
        "notes",
    )
    autocomplete_fields = ("transaction", "fund_account")
    readonly_fields = (
        "transaction",
        "fund_account",
        "direction",
        "amount",
        "category_name",
        "notes",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
