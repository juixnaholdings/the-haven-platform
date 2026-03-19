from django.urls import path

from apps.finance.apis.admin import (
    ExpenseTransactionCreateAdminApi,
    FundAccountDetailAdminApi,
    FundAccountListCreateAdminApi,
    IncomeTransactionCreateAdminApi,
    TransactionDetailAdminApi,
    TransactionListAdminApi,
    TransferTransactionCreateAdminApi,
)

urlpatterns = [
    path("fund-accounts/", FundAccountListCreateAdminApi.as_view(), name="fund-account-list-create"),
    path(
        "fund-accounts/<int:fund_account_id>/",
        FundAccountDetailAdminApi.as_view(),
        name="fund-account-detail",
    ),
    path("transactions/", TransactionListAdminApi.as_view(), name="transaction-list"),
    path(
        "transactions/income/",
        IncomeTransactionCreateAdminApi.as_view(),
        name="transaction-income-create",
    ),
    path(
        "transactions/expense/",
        ExpenseTransactionCreateAdminApi.as_view(),
        name="transaction-expense-create",
    ),
    path(
        "transactions/transfer/",
        TransferTransactionCreateAdminApi.as_view(),
        name="transaction-transfer-create",
    ),
    path(
        "transactions/<int:transaction_id>/",
        TransactionDetailAdminApi.as_view(),
        name="transaction-detail",
    ),
]
