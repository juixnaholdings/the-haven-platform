from drf_spectacular.utils import extend_schema
from rest_framework import status, views
from rest_framework.exceptions import NotFound

from apps.attendance import selectors as attendance_selectors
from apps.common.responses import CustomResponse
from apps.finance import selectors, services
from apps.finance.permissions import FundAccountAdminPermission, TransactionAdminPermission
from apps.finance.serializers import (
    ExpenseTransactionCreateSerializer,
    FundAccountDetailSerializer,
    FundAccountListSerializer,
    FundAccountWriteSerializer,
    IncomeTransactionCreateSerializer,
    TransactionDetailSerializer,
    TransactionListSerializer,
    TransactionUpdateSerializer,
    TransferTransactionCreateSerializer,
)


def _parse_bool(value: str | None):
    if value is None:
        return None
    return value.lower() in {"1", "true", "yes", "on"}


def _get_service_event_or_none(service_event_id):
    if service_event_id is None:
        return None

    service_event = attendance_selectors.get_service_event_by_id(
        service_event_id=service_event_id
    )
    if service_event is None:
        raise NotFound("Service event not found.")
    return service_event


def _get_fund_account_or_404(*, fund_account_id: int):
    fund_account = selectors.get_fund_account_by_id(fund_account_id=fund_account_id)
    if fund_account is None:
        raise NotFound("Fund account not found.")
    return fund_account


class FundAccountListCreateAdminApi(views.APIView):
    permission_classes = [FundAccountAdminPermission]

    @extend_schema(
        tags=["Admin - Finance"],
        summary="List fund accounts",
        responses=FundAccountListSerializer(many=True),
    )
    def get(self, request):
        fund_accounts = selectors.list_fund_accounts(
            filters={
                "search": request.query_params.get("search"),
                "is_active": _parse_bool(request.query_params.get("is_active")),
            }
        )
        serializer = FundAccountListSerializer(fund_accounts, many=True)
        return CustomResponse(
            data=serializer.data,
            message="Fund accounts fetched successfully.",
        )

    @extend_schema(
        tags=["Admin - Finance"],
        summary="Create fund account",
        request=FundAccountWriteSerializer,
        responses=FundAccountDetailSerializer,
    )
    def post(self, request):
        serializer = FundAccountWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        fund_account = services.create_fund_account(
            data=serializer.validated_data,
            actor=request.user,
        )
        fund_account = selectors.get_fund_account_by_id(fund_account_id=fund_account.id)
        response_serializer = FundAccountDetailSerializer(fund_account)
        return CustomResponse(
            data=response_serializer.data,
            message="Fund account created successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class FundAccountDetailAdminApi(views.APIView):
    permission_classes = [FundAccountAdminPermission]

    @extend_schema(
        tags=["Admin - Finance"],
        summary="Retrieve fund account",
        responses=FundAccountDetailSerializer,
    )
    def get(self, request, fund_account_id: int):
        fund_account = selectors.get_fund_account_by_id(fund_account_id=fund_account_id)
        if fund_account is None:
            raise NotFound("Fund account not found.")

        serializer = FundAccountDetailSerializer(fund_account)
        return CustomResponse(
            data=serializer.data,
            message="Fund account fetched successfully.",
        )

    @extend_schema(
        tags=["Admin - Finance"],
        summary="Update fund account",
        request=FundAccountWriteSerializer,
        responses=FundAccountDetailSerializer,
    )
    def patch(self, request, fund_account_id: int):
        fund_account = selectors.get_fund_account_by_id(fund_account_id=fund_account_id)
        if fund_account is None:
            raise NotFound("Fund account not found.")

        serializer = FundAccountWriteSerializer(fund_account, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        fund_account = services.update_fund_account(
            fund_account=fund_account,
            data=serializer.validated_data,
            actor=request.user,
        )
        fund_account = selectors.get_fund_account_by_id(fund_account_id=fund_account.id)
        response_serializer = FundAccountDetailSerializer(fund_account)
        return CustomResponse(
            data=response_serializer.data,
            message="Fund account updated successfully.",
        )


class TransactionListAdminApi(views.APIView):
    permission_classes = [TransactionAdminPermission]

    @extend_schema(
        tags=["Admin - Finance"],
        summary="List transactions",
        responses=TransactionListSerializer(many=True),
    )
    def get(self, request):
        transactions = selectors.list_transactions(
            filters={
                "search": request.query_params.get("search"),
                "transaction_type": request.query_params.get("transaction_type"),
                "fund_account_id": request.query_params.get("fund_account_id"),
                "service_event_id": request.query_params.get("service_event_id"),
                "transaction_date_from": request.query_params.get("transaction_date_from"),
                "transaction_date_to": request.query_params.get("transaction_date_to"),
            }
        )
        serializer = TransactionListSerializer(transactions, many=True)
        return CustomResponse(
            data=serializer.data,
            message="Transactions fetched successfully.",
        )


class TransactionDetailAdminApi(views.APIView):
    permission_classes = [TransactionAdminPermission]

    @extend_schema(
        tags=["Admin - Finance"],
        summary="Retrieve transaction detail",
        responses=TransactionDetailSerializer,
    )
    def get(self, request, transaction_id: int):
        transaction = selectors.get_transaction_detail(transaction_id=transaction_id)
        if transaction is None:
            raise NotFound("Transaction not found.")

        serializer = TransactionDetailSerializer(transaction)
        return CustomResponse(
            data=serializer.data,
            message="Transaction fetched successfully.",
        )

    @extend_schema(
        tags=["Admin - Finance"],
        summary="Update transaction metadata",
        request=TransactionUpdateSerializer,
        responses=TransactionDetailSerializer,
    )
    def patch(self, request, transaction_id: int):
        transaction = selectors.get_transaction_by_id(transaction_id=transaction_id)
        if transaction is None:
            raise NotFound("Transaction not found.")

        serializer = TransactionUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data.copy()
        if "service_event_id" in data:
            data["service_event"] = _get_service_event_or_none(data.pop("service_event_id"))

        transaction = services.update_transaction_metadata(
            transaction=transaction,
            data=data,
            actor=request.user,
        )
        transaction = selectors.get_transaction_detail(transaction_id=transaction.id)
        response_serializer = TransactionDetailSerializer(transaction)
        return CustomResponse(
            data=response_serializer.data,
            message="Transaction updated successfully.",
        )


class IncomeTransactionCreateAdminApi(views.APIView):
    permission_classes = [TransactionAdminPermission]

    @extend_schema(
        tags=["Admin - Finance"],
        summary="Record income",
        request=IncomeTransactionCreateSerializer,
        responses=TransactionDetailSerializer,
    )
    def post(self, request):
        serializer = IncomeTransactionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        fund_account = _get_fund_account_or_404(
            fund_account_id=serializer.validated_data["fund_account_id"]
        )
        service_event = _get_service_event_or_none(
            serializer.validated_data.get("service_event_id")
        )

        transaction = services.record_income(
            fund_account=fund_account,
            amount=serializer.validated_data["amount"],
            transaction_date=serializer.validated_data["transaction_date"],
            description=serializer.validated_data["description"],
            service_event=service_event,
            category_name=serializer.validated_data.get("category_name", ""),
            notes=serializer.validated_data.get("notes", ""),
            actor=request.user,
        )
        transaction = selectors.get_transaction_detail(transaction_id=transaction.id)
        response_serializer = TransactionDetailSerializer(transaction)
        return CustomResponse(
            data=response_serializer.data,
            message="Income recorded successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class ExpenseTransactionCreateAdminApi(views.APIView):
    permission_classes = [TransactionAdminPermission]

    @extend_schema(
        tags=["Admin - Finance"],
        summary="Record expense",
        request=ExpenseTransactionCreateSerializer,
        responses=TransactionDetailSerializer,
    )
    def post(self, request):
        serializer = ExpenseTransactionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        fund_account = _get_fund_account_or_404(
            fund_account_id=serializer.validated_data["fund_account_id"]
        )
        service_event = _get_service_event_or_none(
            serializer.validated_data.get("service_event_id")
        )

        transaction = services.record_expense(
            fund_account=fund_account,
            amount=serializer.validated_data["amount"],
            transaction_date=serializer.validated_data["transaction_date"],
            description=serializer.validated_data["description"],
            service_event=service_event,
            category_name=serializer.validated_data.get("category_name", ""),
            notes=serializer.validated_data.get("notes", ""),
            actor=request.user,
        )
        transaction = selectors.get_transaction_detail(transaction_id=transaction.id)
        response_serializer = TransactionDetailSerializer(transaction)
        return CustomResponse(
            data=response_serializer.data,
            message="Expense recorded successfully.",
            status_code=status.HTTP_201_CREATED,
        )


class TransferTransactionCreateAdminApi(views.APIView):
    permission_classes = [TransactionAdminPermission]

    @extend_schema(
        tags=["Admin - Finance"],
        summary="Record fund transfer",
        request=TransferTransactionCreateSerializer,
        responses=TransactionDetailSerializer,
    )
    def post(self, request):
        serializer = TransferTransactionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        source_fund_account = _get_fund_account_or_404(
            fund_account_id=serializer.validated_data["source_fund_account_id"]
        )
        destination_fund_account = _get_fund_account_or_404(
            fund_account_id=serializer.validated_data["destination_fund_account_id"]
        )
        service_event = _get_service_event_or_none(
            serializer.validated_data.get("service_event_id")
        )

        transaction = services.record_transfer(
            source_fund_account=source_fund_account,
            destination_fund_account=destination_fund_account,
            amount=serializer.validated_data["amount"],
            transaction_date=serializer.validated_data["transaction_date"],
            description=serializer.validated_data["description"],
            service_event=service_event,
            category_name=serializer.validated_data.get("category_name", ""),
            notes=serializer.validated_data.get("notes", ""),
            actor=request.user,
        )
        transaction = selectors.get_transaction_detail(transaction_id=transaction.id)
        response_serializer = TransactionDetailSerializer(transaction)
        return CustomResponse(
            data=response_serializer.data,
            message="Transfer recorded successfully.",
            status_code=status.HTTP_201_CREATED,
        )
