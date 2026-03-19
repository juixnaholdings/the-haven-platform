from decimal import Decimal

from rest_framework import serializers

from apps.attendance.models import ServiceEvent
from apps.finance.models import FundAccount, Transaction, TransactionLine


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

    class Meta:
        model = Transaction
        fields = [
            "id",
            "reference_no",
            "transaction_type",
            "transaction_date",
            "description",
            "service_event_id",
            "service_event_title",
            "posted_at",
            "line_count",
            "total_in_amount",
            "total_out_amount",
        ]


class TransactionDetailSerializer(serializers.ModelSerializer):
    service_event = ServiceEventReferenceSerializer(read_only=True)
    lines = TransactionLineDetailSerializer(many=True, read_only=True)
    total_in_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    total_out_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "reference_no",
            "transaction_type",
            "transaction_date",
            "description",
            "service_event",
            "posted_at",
            "total_in_amount",
            "total_out_amount",
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
    service_event_id = serializers.IntegerField(required=False, allow_null=True)
    category_name = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class ExpenseTransactionCreateSerializer(serializers.Serializer):
    fund_account_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    transaction_date = serializers.DateField()
    description = serializers.CharField()
    service_event_id = serializers.IntegerField(required=False, allow_null=True)
    category_name = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class TransferTransactionCreateSerializer(serializers.Serializer):
    source_fund_account_id = serializers.IntegerField()
    destination_fund_account_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal("0.01"))
    transaction_date = serializers.DateField()
    description = serializers.CharField()
    service_event_id = serializers.IntegerField(required=False, allow_null=True)
    category_name = serializers.CharField(required=False, allow_blank=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class TransactionUpdateSerializer(serializers.Serializer):
    transaction_date = serializers.DateField(required=False)
    description = serializers.CharField(required=False)
    service_event_id = serializers.IntegerField(required=False, allow_null=True)
