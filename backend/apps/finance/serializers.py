from decimal import Decimal

from rest_framework import serializers

from apps.attendance.models import ServiceEvent
from apps.common.serializers import PaginationQuerySerializer
from apps.finance.models import FundAccount, Transaction, TransactionLine


class FundAccountListFilterSerializer(PaginationQuerySerializer):
    search = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)


class TransactionListFilterSerializer(PaginationQuerySerializer):
    search = serializers.CharField(required=False, allow_blank=True)
    transaction_type = serializers.ChoiceField(
        choices=Transaction._meta.get_field("transaction_type").choices,
        required=False,
    )
    category_name = serializers.CharField(required=False, allow_blank=True)
    fund_account_id = serializers.IntegerField(required=False, min_value=1)
    service_event_id = serializers.IntegerField(required=False, min_value=1, allow_null=True)
    transaction_date_from = serializers.DateField(required=False)
    transaction_date_to = serializers.DateField(required=False)

    def validate(self, attrs):
        transaction_date_from = attrs.get("transaction_date_from")
        transaction_date_to = attrs.get("transaction_date_to")
        if transaction_date_from and transaction_date_to and transaction_date_from > transaction_date_to:
            raise serializers.ValidationError(
                {
                    "transaction_date_to": [
                        "Transaction date end cannot be earlier than the start date."
                    ]
                }
            )
        return attrs


class ServiceEventReferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceEvent
        fields = [
            "id",
            "title",
            "event_type",
            "service_date",
        ]


class FundAccountListSerializer(serializers.ModelSerializer):
    current_balance = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = FundAccount
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "current_balance",
        ]


class FundAccountDetailSerializer(serializers.ModelSerializer):
    current_balance = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = FundAccount
        fields = [
            "id",
            "name",
            "code",
            "description",
            "is_active",
            "current_balance",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("created_at", "updated_at")


class FundAccountWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FundAccount
        fields = [
            "name",
            "code",
            "description",
            "is_active",
        ]


class TransactionLineDetailSerializer(serializers.ModelSerializer):
    fund_account_id = serializers.IntegerField(source="fund_account.id", read_only=True)
    fund_account_name = serializers.CharField(source="fund_account.name", read_only=True)
    fund_account_code = serializers.CharField(source="fund_account.code", read_only=True)

    class Meta:
        model = TransactionLine
        fields = [
            "id",
            "fund_account_id",
            "fund_account_name",
            "fund_account_code",
            "direction",
            "amount",
            "category_name",
            "notes",
        ]


class TransactionListSerializer(serializers.ModelSerializer):
    service_event_id = serializers.IntegerField(source="service_event.id", read_only=True)
    service_event_title = serializers.CharField(source="service_event.title", read_only=True)
    line_count = serializers.IntegerField(read_only=True)
    total_in_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_out_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    primary_category = serializers.CharField(read_only=True)
    has_line_notes = serializers.BooleanField(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "reference_no",
            "external_reference",
            "transaction_type",
            "transaction_date",
            "description",
            "service_event_id",
            "service_event_title",
            "posted_at",
            "line_count",
            "total_in_amount",
            "total_out_amount",
            "primary_category",
            "has_line_notes",
        ]


class TransactionDetailSerializer(serializers.ModelSerializer):
    service_event = ServiceEventReferenceSerializer(read_only=True)
    lines = TransactionLineDetailSerializer(many=True, read_only=True)
    total_in_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_out_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    primary_category = serializers.CharField(read_only=True)
    has_line_notes = serializers.BooleanField(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "reference_no",
            "external_reference",
            "transaction_type",
            "transaction_date",
            "description",
            "service_event",
            "posted_at",
            "total_in_amount",
            "total_out_amount",
            "primary_category",
            "has_line_notes",
            "lines",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("created_at", "updated_at")


class IncomeTransactionCreateSerializer(serializers.Serializer):
    fund_account_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    transaction_date = serializers.DateField()
    description = serializers.CharField()
    external_reference = serializers.CharField(required=False, allow_blank=True)
    service_event_id = serializers.IntegerField(required=False, allow_null=True)
    category_name = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class ExpenseTransactionCreateSerializer(serializers.Serializer):
    fund_account_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    transaction_date = serializers.DateField()
    description = serializers.CharField()
    external_reference = serializers.CharField(required=False, allow_blank=True)
    service_event_id = serializers.IntegerField(required=False, allow_null=True)
    category_name = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class TransferTransactionCreateSerializer(serializers.Serializer):
    source_fund_account_id = serializers.IntegerField()
    destination_fund_account_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    transaction_date = serializers.DateField()
    description = serializers.CharField()
    external_reference = serializers.CharField(required=False, allow_blank=True)
    service_event_id = serializers.IntegerField(required=False, allow_null=True)
    category_name = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class TransactionLineMetadataUpdateSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    category_name = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if "category_name" not in attrs and "notes" not in attrs:
            raise serializers.ValidationError(
                "Provide at least one editable field (category_name or notes)."
            )
        return attrs


class TransactionUpdateSerializer(serializers.Serializer):
    transaction_date = serializers.DateField(required=False)
    description = serializers.CharField(required=False)
    external_reference = serializers.CharField(required=False, allow_blank=True)
    service_event_id = serializers.IntegerField(required=False, allow_null=True)
    line_updates = TransactionLineMetadataUpdateSerializer(many=True, required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError(
                "Provide at least one metadata field or line update to change."
            )

        line_updates = attrs.get("line_updates", [])
        if line_updates:
            line_ids = [update["id"] for update in line_updates]
            if len(line_ids) != len(set(line_ids)):
                raise serializers.ValidationError(
                    {
                        "line_updates": [
                            "Each transaction line can appear only once in a metadata update request."
                        ]
                    }
                )
        return attrs
