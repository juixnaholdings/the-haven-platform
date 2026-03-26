import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
import { EntityTable } from "../components/EntityTable";
import { ErrorState } from "../components/ErrorState";
import { FormSection } from "../components/FormSection";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { financeApi } from "../domains/finance/api";
import {
  getTransactionTypeLabel,
  TRANSACTION_TYPE_OPTIONS,
} from "../domains/finance/options";
import { reportingApi } from "../domains/reporting/api";
import { formatAmount, formatDate, formatDateTime } from "../utils/formatters";

export function FinancePage() {
  const [search, setSearch] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("all");
  const [fundAccountFilter, setFundAccountFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const deferredSearch = useDeferredValue(search);

  const fundAccountsQuery = useQuery({
    queryKey: ["finance", "fund-accounts"],
    queryFn: () => financeApi.listFundAccounts(),
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
      { search: deferredSearch, transactionTypeFilter, fundAccountFilter, startDate, endDate },
    ],
    queryFn: () =>
      financeApi.listTransactions({
        search: deferredSearch || undefined,
        transaction_type: transactionTypeFilter === "all" ? undefined : transactionTypeFilter,
        fund_account_id: fundAccountFilter === "all" ? undefined : Number(fundAccountFilter),
        transaction_date_from: startDate || undefined,
        transaction_date_to: endDate || undefined,
      }),
  });

  if (fundAccountsQuery.isLoading || financeSummaryQuery.isLoading || transactionsQuery.isLoading) {
    return (
      <LoadingState
        title="Loading ledger overview"
        description="Fetching fund balances, finance reporting totals, and posted transactions."
      />
    );
  }

  if (fundAccountsQuery.error || financeSummaryQuery.error || transactionsQuery.error) {
    return (
      <ErrorState
        title="Ledger overview could not be loaded"
        error={fundAccountsQuery.error ?? financeSummaryQuery.error ?? transactionsQuery.error}
        onRetry={() => {
          void fundAccountsQuery.refetch();
          void financeSummaryQuery.refetch();
          void transactionsQuery.refetch();
        }}
      />
    );
  }

  const fundAccounts = fundAccountsQuery.data ?? [];
  const financeSummary = financeSummaryQuery.data;
  const transactions = transactionsQuery.data ?? [];
  const hasFilters =
    Boolean(search.trim()) ||
    transactionTypeFilter !== "all" ||
    fundAccountFilter !== "all" ||
    Boolean(startDate || endDate);

  const activeFundCount = useMemo(
    () => fundAccounts.filter((fundAccount) => fundAccount.is_active).length,
    [fundAccounts],
  );

  if (!financeSummary) {
    return null;
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Finance / ledger"
        title="Ledger"
        description="This finance surface works against the posted-ledger backend. Balances come from transaction lines, and there is no reversal or void workflow exposed here."
        actions={
          <div className="inline-actions">
            <Link className="button button-primary" to="/finance/entries/income">
              Record income
            </Link>
            <Link className="button button-secondary" to="/finance/entries/expense">
              Record expense
            </Link>
            <Link className="button button-ghost" to="/finance/transfers/new">
              New transfer
            </Link>
          </div>
        }
        meta={
          <>
            <StatusBadge
              label={startDate || endDate ? "Filtered range" : "All-time ledger"}
              tone="info"
            />
            <StatusBadge
              label={`${activeFundCount} active fund${activeFundCount === 1 ? "" : "s"}`}
              tone="success"
            />
          </>
        }
      />

      <section className="metrics-grid">
        <StatCard label="Fund accounts" value={financeSummary.total_fund_accounts} tone="accent" />
        <StatCard label="Income in range" value={formatAmount(financeSummary.total_income)} />
        <StatCard label="Expense in range" value={formatAmount(financeSummary.total_expense)} />
        <StatCard label="Net flow" value={formatAmount(financeSummary.net_flow)} />
      </section>

      <div className="panel-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Fund balances</h3>
              <p className="muted-text">Current balances derived from posted ledger lines.</p>
            </div>
          </div>

          {fundAccounts.length === 0 ? (
            <EmptyState
              title="No fund accounts are available"
              description="Create baseline funds through the existing bootstrap command or Django admin before using finance entries."
            />
          ) : (
            <EntityTable
              columns={[
                {
                  header: "Fund",
                  cell: (fundAccount) => (
                    <div className="cell-stack">
                      <strong>{fundAccount.name}</strong>
                      <span className="table-subtext">{fundAccount.code}</span>
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

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Posting behavior</h3>
              <p className="muted-text">Operational expectations for this finance wave.</p>
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
                <span>No audit-timeline endpoint exists yet, so detail pages only show current record metadata and ledger lines.</span>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <form className="page-stack">
        <FormSection
          title="Ledger filters"
          description="Filter the posted transaction ledger by description, type, fund, or date range."
        >
          <div className="form-grid form-grid-3">
            <label className="field">
              <span>Search transactions</span>
              <input
                placeholder="Search by reference or description"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Transaction type</span>
              <select
                value={transactionTypeFilter}
                onChange={(event) => setTransactionTypeFilter(event.target.value)}
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
                value={fundAccountFilter}
                onChange={(event) => setFundAccountFilter(event.target.value)}
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
              <span>Start date</span>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </label>

            <label className="field">
              <span>End date</span>
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            </label>

            <div className="inline-actions inline-actions-bottom">
              <button
                className="button button-secondary"
                onClick={() => {
                  setSearch("");
                  setTransactionTypeFilter("all");
                  setFundAccountFilter("all");
                  setStartDate("");
                  setEndDate("");
                }}
                type="button"
              >
                Reset filters
              </button>
            </div>
          </div>
        </FormSection>
      </form>

      {transactions.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No transactions matched the current filters" : "No transactions have been posted yet"}
          description={
            hasFilters
              ? "Try broadening the date range or clearing the current ledger filters."
              : "Record income, expense, or a fund transfer to populate the ledger."
          }
          action={
            hasFilters ? (
              <button
                className="button button-secondary"
                onClick={() => {
                  setSearch("");
                  setTransactionTypeFilter("all");
                  setFundAccountFilter("all");
                  setStartDate("");
                  setEndDate("");
                }}
                type="button"
              >
                Clear filters
              </button>
            ) : (
              <Link className="button button-primary" to="/finance/entries/income">
                Record first entry
              </Link>
            )
          }
        />
      ) : (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Posted transactions</h3>
              <p className="muted-text">Use transaction detail to inspect ledger lines and update safe metadata only.</p>
            </div>
          </div>

          <EntityTable
            columns={[
              {
                header: "Transaction",
                cell: (transaction) => (
                  <div className="cell-stack">
                    <Link className="table-link" to={`/finance/transactions/${transaction.id}`}>
                      {transaction.reference_no}
                    </Link>
                    <span className="table-subtext">{transaction.description}</span>
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
                  <div className="cell-stack">
                    <span>In: {formatAmount(transaction.total_in_amount)}</span>
                    <span className="table-subtext">Out: {formatAmount(transaction.total_out_amount)}</span>
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
                  <Link
                    className="button button-secondary button-compact"
                    to={`/finance/transactions/${transaction.id}`}
                  >
                    View
                  </Link>
                ),
              },
            ]}
            getRowKey={(transaction) => transaction.id}
            rows={transactions}
          />
        </section>
      )}
    </div>
  );
}
