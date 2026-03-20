import { apiClient } from "../../api/client";
import type {
  ExpenseTransactionPayload,
  FundAccountDetail,
  FundAccountListFilters,
  FundAccountListItem,
  FundAccountWritePayload,
  IncomeTransactionPayload,
  TransactionDetail,
  TransactionListFilters,
  TransactionListItem,
  TransactionUpdatePayload,
  TransferTransactionPayload,
} from "../types";

export const financeApi = {
  listFundAccounts(filters: FundAccountListFilters = {}) {
    return apiClient.get<FundAccountListItem[]>("/api/finance/fund-accounts/", { params: filters });
  },
  getFundAccount(fundAccountId: number) {
    return apiClient.get<FundAccountDetail>(`/api/finance/fund-accounts/${fundAccountId}/`);
  },
  createFundAccount(payload: FundAccountWritePayload) {
    return apiClient.post<FundAccountDetail, FundAccountWritePayload>(
      "/api/finance/fund-accounts/",
      payload,
    );
  },
  updateFundAccount(fundAccountId: number, payload: Partial<FundAccountWritePayload>) {
    return apiClient.patch<FundAccountDetail, Partial<FundAccountWritePayload>>(
      `/api/finance/fund-accounts/${fundAccountId}/`,
      payload,
    );
  },
  listTransactions(filters: TransactionListFilters = {}) {
    return apiClient.get<TransactionListItem[]>("/api/finance/transactions/", { params: filters });
  },
  getTransaction(transactionId: number) {
    return apiClient.get<TransactionDetail>(`/api/finance/transactions/${transactionId}/`);
  },
  updateTransaction(transactionId: number, payload: TransactionUpdatePayload) {
    return apiClient.patch<TransactionDetail, TransactionUpdatePayload>(
      `/api/finance/transactions/${transactionId}/`,
      payload,
    );
  },
  recordIncome(payload: IncomeTransactionPayload) {
    return apiClient.post<TransactionDetail, IncomeTransactionPayload>(
      "/api/finance/transactions/income/",
      payload,
    );
  },
  recordExpense(payload: ExpenseTransactionPayload) {
    return apiClient.post<TransactionDetail, ExpenseTransactionPayload>(
      "/api/finance/transactions/expense/",
      payload,
    );
  },
  recordTransfer(payload: TransferTransactionPayload) {
    return apiClient.post<TransactionDetail, TransferTransactionPayload>(
      "/api/finance/transactions/transfer/",
      payload,
    );
  },
};
