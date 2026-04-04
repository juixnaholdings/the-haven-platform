"use client";

import { useDeferredValue, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { queryClient } from "@/api/queryClient";
import {
  BlockedFeatureCard,
  EmptyState,
  EntityTable,
  ErrorAlert,
  ErrorState,
  FilterActionStrip,
  FormModalShell,
  FormSection,
  LoadingState,
  PageHeader,
  PaginationControls,
  StatCard,
  StatusBadge,
} from "@/components";
import { attendanceApi } from "@/domains/attendance/api";
import { financeApi } from "@/domains/finance/api";
import { getTransactionTypeLabel, TRANSACTION_TYPE_OPTIONS } from "@/domains/finance/options";
import { reportingApi } from "@/domains/reporting/api";
import type {
  ExpenseTransactionPayload,
  IncomeTransactionPayload,
  TransferTransactionPayload,
} from "@/domains/types";
import { formatAmount, formatDate, formatDateTime } from "@/lib/formatters";

interface EntryFormState {
  fund_account_id: string;
  amount: string;
  transaction_date: string;
  description: string;
  external_reference: string;
  service_event_id: string;
  category_name: string;
  notes: string;
}

interface TransferFormState {
  source_fund_account_id: string;
  destination_fund_account_id: string;
  amount: string;
  transaction_date: string;
  description: string;
  external_reference: string;
  service_event_id: string;
  category_name: string;
  notes: string;
}

const emptyEntryForm: EntryFormState = {
  fund_account_id: "",
  amount: "",
  transaction_date: new Date().toISOString().slice(0, 10),
  description: "",
  external_reference: "",
  service_event_id: "",
  category_name: "",
  notes: "",
};

const emptyTransferForm: TransferFormState = {
  source_fund_account_id: "",
  destination_fund_account_id: "",
  amount: "",
  transaction_date: new Date().toISOString().slice(0, 10),
  description: "",
  external_reference: "",
  service_event_id: "",
  category_name: "",
  notes: "",
};

function toEntryPayload(formState: EntryFormState): IncomeTransactionPayload | ExpenseTransactionPayload {
  return {
    fund_account_id: Number(formState.fund_account_id),
    amount: formState.amount,
    transaction_date: formState.transaction_date,
    description: formState.description,
    external_reference: formState.external_reference || undefined,
    service_event_id: formState.service_event_id ? Number(formState.service_event_id) : null,
    category_name: formState.category_name || undefined,
    notes: formState.notes || undefined,
  };
}

function toTransferPayload(formState: TransferFormState): TransferTransactionPayload {
  return {
    source_fund_account_id: Number(formState.source_fund_account_id),
    destination_fund_account_id: Number(formState.destination_fund_account_id),
    amount: formState.amount,
    transaction_date: formState.transaction_date,
    description: formState.description,
    external_reference: formState.external_reference || undefined,
    service_event_id: formState.service_event_id ? Number(formState.service_event_id) : null,
    category_name: formState.category_name || undefined,
    notes: formState.notes || undefined,
  };
}

export function FinancePageScreen() {
  const [search, setSearch] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [fundAccountFilter, setFundAccountFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [incomeFormState, setIncomeFormState] = useState<EntryFormState>(emptyEntryForm);
  const [expenseFormState, setExpenseFormState] = useState<EntryFormState>(emptyEntryForm);
  const [transferFormState, setTransferFormState] = useState<TransferFormState>(emptyTransferForm);
  const [isTransferConfirmed, setIsTransferConfirmed] = useState(false);
  const deferredSearch = useDeferredValue(search);

  const fundAccountsQuery = useQuery({
    queryKey: ["finance", "fund-accounts"],
    queryFn: () => financeApi.listFundAccounts(),
  });

  const serviceEventsQuery = useQuery({
    queryKey: ["attendance", "service-events", "active"],
    queryFn: () => attendanceApi.listServiceEvents({ is_active: true }),
  });

  const financeSummaryQuery = useQuery({
    queryKey: ["reporting", "finance", { startDate, endDate }],
    queryFn: () =>
      reportingApi.getFinanceSummary({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
  });

  const transactionsQuery = useQuery({
    queryKey: [
      "finance",
      "transactions",
      {
        search: deferredSearch,
        transactionTypeFilter,
        categoryFilter,
        fundAccountFilter,
        startDate,
        endDate,
        page,
        pageSize,
      },
    ],
    queryFn: () =>
      financeApi.listTransactionsPage({
        search: deferredSearch || undefined,
        transaction_type: transactionTypeFilter === "all" ? undefined : transactionTypeFilter,
        category_name: categoryFilter || undefined,
        fund_account_id: fundAccountFilter === "all" ? undefined : Number(fundAccountFilter),
        transaction_date_from: startDate || undefined,
        transaction_date_to: endDate || undefined,
        page,
        page_size: pageSize,
      }),
  });

  const incomeMutation = useMutation({
    mutationFn: (payload: IncomeTransactionPayload | ExpenseTransactionPayload) =>
      financeApi.recordIncome(payload as IncomeTransactionPayload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance"] });
      await queryClient.invalidateQueries({ queryKey: ["reporting"] });
      setIncomeFormState(emptyEntryForm);
      setIsIncomeModalOpen(false);
    },
  });

  const expenseMutation = useMutation({
    mutationFn: (payload: IncomeTransactionPayload | ExpenseTransactionPayload) =>
      financeApi.recordExpense(payload as ExpenseTransactionPayload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance"] });
      await queryClient.invalidateQueries({ queryKey: ["reporting"] });
      setExpenseFormState(emptyEntryForm);
      setIsExpenseModalOpen(false);
    },
  });

  const transferMutation = useMutation({
    mutationFn: (payload: TransferTransactionPayload) => financeApi.recordTransfer(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance"] });
      await queryClient.invalidateQueries({ queryKey: ["reporting"] });
      setTransferFormState(emptyTransferForm);
      setIsTransferConfirmed(false);
      setIsTransferModalOpen(false);
    },
  });

  if (
    fundAccountsQuery.isLoading ||
    serviceEventsQuery.isLoading ||
    financeSummaryQuery.isLoading ||
    transactionsQuery.isLoading
  ) {
    return (
      <LoadingState
        description="Fetching fund balances, finance reporting totals, and posted transactions."
        title="Loading ledger overview"
      />
    );
  }

  if (fundAccountsQuery.error || serviceEventsQuery.error || financeSummaryQuery.error || transactionsQuery.error) {
    return (
      <ErrorState
        error={
          fundAccountsQuery.error ??
          serviceEventsQuery.error ??
          financeSummaryQuery.error ??
          transactionsQuery.error
        }
        onRetry={() => {
          void fundAccountsQuery.refetch();
          void serviceEventsQuery.refetch();
          void financeSummaryQuery.refetch();
          void transactionsQuery.refetch();
        }}
        title="Ledger overview could not be loaded"
      />
    );
  }

  const fundAccounts = fundAccountsQuery.data ?? [];
  const serviceEvents = serviceEventsQuery.data ?? [];
  const financeSummary = financeSummaryQuery.data;
  const transactions = transactionsQuery.data?.items ?? [];
  const transactionsPagination = transactionsQuery.data?.pagination ?? null;
  const totalTransactions = transactionsPagination?.count ?? transactions.length;
  const hasFilters =
    Boolean(search.trim()) ||
    transactionTypeFilter !== "all" ||
    Boolean(categoryFilter.trim()) ||
    fundAccountFilter !== "all" ||
    Boolean(startDate || endDate);

  const activeFundCount = fundAccounts.filter((fundAccount) => fundAccount.is_active).length;
  const canRecordEntry = fundAccounts.length > 0;
  const canRecordTransfer = fundAccounts.length > 1;
  const latestTransaction = [...transactions].sort((left, right) => right.posted_at.localeCompare(left.posted_at))[0];

  if (!financeSummary) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="button button-primary"
              disabled={!canRecordEntry}
              onClick={() => setIsIncomeModalOpen(true)}
              type="button"
            >
              Record income
            </button>
            <button
              className="button button-secondary"
              disabled={!canRecordEntry}
              onClick={() => setIsExpenseModalOpen(true)}
              type="button"
            >
              Record expense
            </button>
            <button
              className="button button-ghost"
              disabled={!canRecordTransfer}
              onClick={() => setIsTransferModalOpen(true)}
              type="button"
            >
              New transfer
            </button>
          </div>
        }
        description="This finance surface works against the posted-ledger backend. Balances come from transaction lines, and there is no reversal or void workflow exposed here."
        eyebrow="Finance / ledger"
        meta={
          <>
            <StatusBadge label={startDate || endDate ? "Filtered range" : "All-time ledger"} tone="info" />
            <StatusBadge
              label={`${activeFundCount} active fund${activeFundCount === 1 ? "" : "s"}`}
              tone="success"
            />
          </>
        }
        title="Ledger"
      />

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Fund accounts" tone="accent" value={financeSummary.total_fund_accounts} />
        <StatCard label="Income in range" value={formatAmount(financeSummary.total_income)} />
        <StatCard label="Expense in range" value={formatAmount(financeSummary.total_expense)} />
        <StatCard label="Net flow" value={formatAmount(financeSummary.net_flow)} />
      </section>

      <FormModalShell
        description="Record a posted income entry without leaving the ledger screen."
        isOpen={isIncomeModalOpen}
        onClose={() => {
          setIncomeFormState(emptyEntryForm);
          setIsIncomeModalOpen(false);
        }}
        size="large"
        title="Record income"
      >
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            incomeMutation.mutate(toEntryPayload(incomeFormState));
          }}
        >
          <FormSection title="Entry details">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field">
                <span>Fund account</span>
                <select
                  onChange={(event) =>
                    setIncomeFormState((current) => ({ ...current, fund_account_id: event.target.value }))
                  }
                  required
                  value={incomeFormState.fund_account_id}
                >
                  <option value="">Select fund account</option>
                  {fundAccounts.map((fundAccount) => (
                    <option key={`income-${fundAccount.id}`} value={fundAccount.id}>
                      {fundAccount.name} - {fundAccount.code}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Amount</span>
                <input
                  min="0.01"
                  onChange={(event) => setIncomeFormState((current) => ({ ...current, amount: event.target.value }))}
                  required
                  step="0.01"
                  type="number"
                  value={incomeFormState.amount}
                />
              </label>

              <label className="field">
                <span>Transaction date</span>
                <input
                  onChange={(event) =>
                    setIncomeFormState((current) => ({ ...current, transaction_date: event.target.value }))
                  }
                  required
                  type="date"
                  value={incomeFormState.transaction_date}
                />
              </label>

              <label className="field">
                <span>Description</span>
                <input
                  onChange={(event) =>
                    setIncomeFormState((current) => ({ ...current, description: event.target.value }))
                  }
                  required
                  value={incomeFormState.description}
                />
              </label>

              <label className="field">
                <span>External reference</span>
                <input
                  onChange={(event) =>
                    setIncomeFormState((current) => ({ ...current, external_reference: event.target.value }))
                  }
                  placeholder="Bank ref, receipt no, voucher no..."
                  value={incomeFormState.external_reference}
                />
              </label>

              <label className="field">
                <span>Category</span>
                <input
                  onChange={(event) =>
                    setIncomeFormState((current) => ({ ...current, category_name: event.target.value }))
                  }
                  placeholder="Offering, tithe, pledge..."
                  value={incomeFormState.category_name}
                />
              </label>

              <label className="field">
                <span>Linked service/event</span>
                <select
                  onChange={(event) =>
                    setIncomeFormState((current) => ({ ...current, service_event_id: event.target.value }))
                  }
                  value={incomeFormState.service_event_id}
                >
                  <option value="">No linked event</option>
                  {serviceEvents.map((serviceEvent) => (
                    <option key={`income-event-${serviceEvent.id}`} value={serviceEvent.id}>
                      {serviceEvent.title} - {serviceEvent.service_date}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Notes</span>
              <textarea
                onChange={(event) => setIncomeFormState((current) => ({ ...current, notes: event.target.value }))}
                rows={4}
                value={incomeFormState.notes}
              />
            </label>
          </FormSection>

          <ErrorAlert error={incomeMutation.error} fallbackMessage="Income could not be recorded." />

          <div className="flex flex-wrap items-center gap-2.5">
            <button className="button button-primary" disabled={incomeMutation.isPending} type="submit">
              {incomeMutation.isPending ? "Saving..." : "Record income"}
            </button>
            <button
              className="button button-secondary"
              onClick={() => {
                setIncomeFormState(emptyEntryForm);
                setIsIncomeModalOpen(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </FormModalShell>

      <FormModalShell
        description="Record a posted expense entry without leaving the ledger screen."
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setExpenseFormState(emptyEntryForm);
          setIsExpenseModalOpen(false);
        }}
        size="large"
        title="Record expense"
      >
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            expenseMutation.mutate(toEntryPayload(expenseFormState));
          }}
        >
          <FormSection title="Entry details">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field">
                <span>Fund account</span>
                <select
                  onChange={(event) =>
                    setExpenseFormState((current) => ({ ...current, fund_account_id: event.target.value }))
                  }
                  required
                  value={expenseFormState.fund_account_id}
                >
                  <option value="">Select fund account</option>
                  {fundAccounts.map((fundAccount) => (
                    <option key={`expense-${fundAccount.id}`} value={fundAccount.id}>
                      {fundAccount.name} - {fundAccount.code}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Amount</span>
                <input
                  min="0.01"
                  onChange={(event) =>
                    setExpenseFormState((current) => ({ ...current, amount: event.target.value }))
                  }
                  required
                  step="0.01"
                  type="number"
                  value={expenseFormState.amount}
                />
              </label>

              <label className="field">
                <span>Transaction date</span>
                <input
                  onChange={(event) =>
                    setExpenseFormState((current) => ({ ...current, transaction_date: event.target.value }))
                  }
                  required
                  type="date"
                  value={expenseFormState.transaction_date}
                />
              </label>

              <label className="field">
                <span>Description</span>
                <input
                  onChange={(event) =>
                    setExpenseFormState((current) => ({ ...current, description: event.target.value }))
                  }
                  required
                  value={expenseFormState.description}
                />
              </label>

              <label className="field">
                <span>External reference</span>
                <input
                  onChange={(event) =>
                    setExpenseFormState((current) => ({ ...current, external_reference: event.target.value }))
                  }
                  placeholder="Invoice no, bank ref, receipt no..."
                  value={expenseFormState.external_reference}
                />
              </label>

              <label className="field">
                <span>Category</span>
                <input
                  onChange={(event) =>
                    setExpenseFormState((current) => ({ ...current, category_name: event.target.value }))
                  }
                  placeholder="Maintenance, welfare, supplies..."
                  value={expenseFormState.category_name}
                />
              </label>

              <label className="field">
                <span>Linked service/event</span>
                <select
                  onChange={(event) =>
                    setExpenseFormState((current) => ({ ...current, service_event_id: event.target.value }))
                  }
                  value={expenseFormState.service_event_id}
                >
                  <option value="">No linked event</option>
                  {serviceEvents.map((serviceEvent) => (
                    <option key={`expense-event-${serviceEvent.id}`} value={serviceEvent.id}>
                      {serviceEvent.title} - {serviceEvent.service_date}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Notes</span>
              <textarea
                onChange={(event) => setExpenseFormState((current) => ({ ...current, notes: event.target.value }))}
                rows={4}
                value={expenseFormState.notes}
              />
            </label>
          </FormSection>

          <ErrorAlert error={expenseMutation.error} fallbackMessage="Expense could not be recorded." />

          <div className="flex flex-wrap items-center gap-2.5">
            <button className="button button-primary" disabled={expenseMutation.isPending} type="submit">
              {expenseMutation.isPending ? "Saving..." : "Record expense"}
            </button>
            <button
              className="button button-secondary"
              onClick={() => {
                setExpenseFormState(emptyEntryForm);
                setIsExpenseModalOpen(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </FormModalShell>

      <FormModalShell
        description="Record a balanced transfer between two active funds."
        isOpen={isTransferModalOpen}
        onClose={() => {
          setTransferFormState(emptyTransferForm);
          setIsTransferConfirmed(false);
          setIsTransferModalOpen(false);
        }}
        size="large"
        title="New transfer"
      >
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            transferMutation.mutate(toTransferPayload(transferFormState));
          }}
        >
          <FormSection title="Transfer details">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field">
                <span>Source fund</span>
                <select
                  onChange={(event) =>
                    setTransferFormState((current) => ({ ...current, source_fund_account_id: event.target.value }))
                  }
                  required
                  value={transferFormState.source_fund_account_id}
                >
                  <option value="">Select source fund</option>
                  {fundAccounts.map((fundAccount) => (
                    <option key={`source-${fundAccount.id}`} value={fundAccount.id}>
                      {fundAccount.name} - {fundAccount.code}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Destination fund</span>
                <select
                  onChange={(event) =>
                    setTransferFormState((current) => ({
                      ...current,
                      destination_fund_account_id: event.target.value,
                    }))
                  }
                  required
                  value={transferFormState.destination_fund_account_id}
                >
                  <option value="">Select destination fund</option>
                  {fundAccounts.map((fundAccount) => (
                    <option key={`destination-${fundAccount.id}`} value={fundAccount.id}>
                      {fundAccount.name} - {fundAccount.code}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Amount</span>
                <input
                  min="0.01"
                  onChange={(event) =>
                    setTransferFormState((current) => ({ ...current, amount: event.target.value }))
                  }
                  required
                  step="0.01"
                  type="number"
                  value={transferFormState.amount}
                />
              </label>

              <label className="field">
                <span>Transaction date</span>
                <input
                  onChange={(event) =>
                    setTransferFormState((current) => ({ ...current, transaction_date: event.target.value }))
                  }
                  required
                  type="date"
                  value={transferFormState.transaction_date}
                />
              </label>

              <label className="field">
                <span>Description</span>
                <input
                  onChange={(event) =>
                    setTransferFormState((current) => ({ ...current, description: event.target.value }))
                  }
                  required
                  value={transferFormState.description}
                />
              </label>

              <label className="field">
                <span>External reference</span>
                <input
                  onChange={(event) =>
                    setTransferFormState((current) => ({ ...current, external_reference: event.target.value }))
                  }
                  placeholder="Transfer slip, bank batch, memo id..."
                  value={transferFormState.external_reference}
                />
              </label>

              <label className="field">
                <span>Category</span>
                <input
                  onChange={(event) =>
                    setTransferFormState((current) => ({ ...current, category_name: event.target.value }))
                  }
                  placeholder="Internal transfer, welfare reallocation..."
                  value={transferFormState.category_name}
                />
              </label>

              <label className="field">
                <span>Linked service/event</span>
                <select
                  onChange={(event) =>
                    setTransferFormState((current) => ({ ...current, service_event_id: event.target.value }))
                  }
                  value={transferFormState.service_event_id}
                >
                  <option value="">No linked event</option>
                  {serviceEvents.map((serviceEvent) => (
                    <option key={`transfer-event-${serviceEvent.id}`} value={serviceEvent.id}>
                      {serviceEvent.title} - {serviceEvent.service_date}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Notes</span>
              <textarea
                onChange={(event) => setTransferFormState((current) => ({ ...current, notes: event.target.value }))}
                rows={4}
                value={transferFormState.notes}
              />
            </label>

            <label className="inline-flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-slate-700">
              <input
                checked={isTransferConfirmed}
                className="mt-1 size-4 rounded border-slate-300 text-[#16335f] focus:ring-[#16335f]"
                onChange={(event) => setIsTransferConfirmed(event.target.checked)}
                type="checkbox"
              />
              <span>I confirm the source, destination, amount, and metadata are correct for this posted transfer.</span>
            </label>
          </FormSection>

          <ErrorAlert error={transferMutation.error} fallbackMessage="Transfer could not be recorded." />

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="button button-primary"
              disabled={transferMutation.isPending || !isTransferConfirmed}
              type="submit"
            >
              {transferMutation.isPending ? "Saving..." : "Record transfer"}
            </button>
            <button
              className="button button-secondary"
              onClick={() => {
                setTransferFormState(emptyTransferForm);
                setIsTransferConfirmed(false);
                setIsTransferModalOpen(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </FormModalShell>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Fund balances</h3>
              <p className="m-0 text-sm text-slate-500">Current balances derived from posted ledger lines.</p>
            </div>
          </div>

          {fundAccounts.length === 0 ? (
            <EmptyState
              description="Create baseline funds through the existing bootstrap command or Django admin before using finance entries."
              title="No fund accounts are available"
            />
          ) : (
            <EntityTable
              columns={[
                {
                  header: "Fund",
                  cell: (fundAccount) => (
                    <div className="grid gap-1">
                      <strong>{fundAccount.name}</strong>
                      <span className="block text-xs text-slate-500">{fundAccount.code}</span>
                    </div>
                  ),
                },
                {
                  header: "Balance",
                  cell: (fundAccount) => formatAmount(fundAccount.current_balance),
                },
                {
                  header: "Status",
                  cell: (fundAccount) => (
                    <StatusBadge
                      label={fundAccount.is_active ? "Active" : "Inactive"}
                      tone={fundAccount.is_active ? "success" : "muted"}
                    />
                  ),
                },
              ]}
              getRowKey={(fundAccount) => fundAccount.id}
              rows={fundAccounts}
            />
          )}
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Posting behavior</h3>
              <p className="m-0 text-sm text-slate-500">Operational expectations for this finance wave.</p>
            </div>
          </div>
          <ul className="item-list">
            <li className="item-row">
              <div>
                <strong>Transactions post immediately</strong>
                <span>There is no draft or approval workflow on the current backend contract.</span>
              </div>
            </li>
            <li className="item-row">
              <div>
                <strong>Transfers stay balanced</strong>
                <span>Each transfer creates one OUT line and one IN line under the same transaction.</span>
              </div>
            </li>
            <li className="item-row">
              <div>
                <strong>Transaction detail is honest</strong>
                <span>
                  No audit-timeline endpoint exists yet, so detail pages only show current record metadata and
                  ledger lines.
                </span>
              </div>
            </li>
          </ul>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Latest posting</h3>
              <p className="m-0 text-sm text-slate-500">A quick checkpoint from the most recent posted record.</p>
            </div>
          </div>
          {latestTransaction ? (
            <dl className="definition-list">
              <div>
                <dt>Reference</dt>
                <dd>{latestTransaction.reference_no}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{getTransactionTypeLabel(latestTransaction.transaction_type)}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{formatDate(latestTransaction.transaction_date)}</dd>
              </div>
              <div>
                <dt>Posted at</dt>
                <dd>{formatDateTime(latestTransaction.posted_at)}</dd>
              </div>
            </dl>
          ) : (
            <EmptyState
              description="Record income, expense, or transfer entries to establish the ledger timeline."
              title="No posted transaction yet"
            />
          )}
        </section>
      </div>

      <BlockedFeatureCard
        description="The current finance contract does not expose reversal, void, or delete actions for posted transactions."
        reason="Use careful transaction descriptions and metadata updates for corrections. If a reversal workflow is needed, it requires a dedicated backend slice."
        title="Reversal and void workflow"
      />

      <FilterActionStrip
        actions={
          <button
            className="button button-secondary"
            onClick={() => {
              setSearch("");
              setTransactionTypeFilter("all");
              setCategoryFilter("");
              setFundAccountFilter("all");
              setStartDate("");
              setEndDate("");
              setPage(1);
            }}
            type="button"
          >
            Reset filters
          </button>
        }
        filters={
          <>
            <label className="field">
              <span>Transaction type</span>
              <select
                onChange={(event) => {
                  setTransactionTypeFilter(event.target.value);
                  setPage(1);
                }}
                value={transactionTypeFilter}
              >
                <option value="all">All transaction types</option>
                {TRANSACTION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Fund account</span>
              <select
                onChange={(event) => {
                  setFundAccountFilter(event.target.value);
                  setPage(1);
                }}
                value={fundAccountFilter}
              >
                <option value="all">All funds</option>
                {fundAccounts.map((fundAccount) => (
                  <option key={fundAccount.id} value={fundAccount.id}>
                    {fundAccount.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Category contains</span>
              <input
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  setPage(1);
                }}
                placeholder="Offering, welfare, maintenance..."
                value={categoryFilter}
              />
            </label>

            <label className="field">
              <span>Start date</span>
              <input
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setPage(1);
                }}
                type="date"
                value={startDate}
              />
            </label>

            <label className="field">
              <span>End date</span>
              <input
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setPage(1);
                }}
                type="date"
                value={endDate}
              />
            </label>
          </>
        }
        search={
          <label className="field">
            <span>Search transactions</span>
            <input
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by reference or description"
              value={search}
            />
          </label>
        }
      />

      {transactions.length === 0 ? (
        <EmptyState
          action={
            hasFilters ? (
              <button
                className="button button-secondary"
                onClick={() => {
                  setSearch("");
                  setTransactionTypeFilter("all");
                  setCategoryFilter("");
                  setFundAccountFilter("all");
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
                type="button"
              >
                Clear filters
              </button>
            ) : (
              <button className="button button-primary" onClick={() => setIsIncomeModalOpen(true)} type="button">
                Record first entry
              </button>
            )
          }
          description={
            hasFilters
              ? "Try broadening the date range or clearing the current ledger filters."
              : "Record income, expense, or a fund transfer to populate the ledger."
          }
          title={
            hasFilters ? "No transactions matched the current filters" : "No transactions have been posted yet"
          }
        />
      ) : (
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Posted transactions</h3>
              <p className="m-0 text-sm text-slate-500">
                Use transaction detail to inspect ledger lines and update safe metadata only.
              </p>
            </div>
            <StatusBadge
              label={`${totalTransactions} transaction${totalTransactions === 1 ? "" : "s"}`}
              tone="info"
            />
          </div>

          <EntityTable
            columns={[
              {
                header: "Transaction",
                cell: (transaction) => (
                  <div className="grid gap-1">
                    <Link className="font-semibold text-[#16335f] hover:underline" href={`/finance/transactions/${transaction.id}`}>
                      {transaction.reference_no}
                    </Link>
                    {transaction.external_reference ? (
                      <span className="block text-xs text-slate-500">
                        External ref: {transaction.external_reference}
                      </span>
                    ) : (
                      <span className="block text-xs text-slate-400">External ref not set</span>
                    )}
                    <span className="block text-xs text-slate-500">{transaction.description}</span>
                  </div>
                ),
              },
              {
                header: "Type",
                cell: (transaction) => (
                  <StatusBadge
                    label={getTransactionTypeLabel(transaction.transaction_type)}
                    tone={
                      transaction.transaction_type === "INCOME"
                        ? "success"
                        : transaction.transaction_type === "EXPENSE"
                          ? "warning"
                          : "info"
                    }
                  />
                ),
              },
              {
                header: "Date",
                cell: (transaction) => formatDate(transaction.transaction_date),
              },
              {
                header: "Movement",
                cell: (transaction) => (
                  <div className="grid gap-1">
                    <span>In: {formatAmount(transaction.total_in_amount)}</span>
                    <span className="block text-xs text-slate-500">Out: {formatAmount(transaction.total_out_amount)}</span>
                  </div>
                ),
              },
              {
                header: "Category",
                cell: (transaction) => (
                  <div className="grid gap-1">
                    <span>{transaction.primary_category || "Not categorized"}</span>
                    <StatusBadge
                      label={transaction.has_line_notes ? "Notes present" : "No line notes"}
                      tone={transaction.has_line_notes ? "info" : "muted"}
                    />
                  </div>
                ),
              },
              {
                header: "Linked event",
                cell: (transaction) => transaction.service_event_title || "Not linked",
              },
              {
                header: "Posted",
                cell: (transaction) => formatDateTime(transaction.posted_at),
              },
              {
                header: "Actions",
                className: "cell-actions",
                cell: (transaction) => (
                  <Link className="button button-secondary button-compact" href={`/finance/transactions/${transaction.id}`}>
                    View
                  </Link>
                ),
              },
            ]}
            getRowKey={(transaction) => transaction.id}
            rows={transactions}
          />
          <PaginationControls
            onPageChange={(nextPage) => setPage(nextPage)}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
            pagination={transactionsPagination}
          />
        </section>
      )}
    </div>
  );
}
