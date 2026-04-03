"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { queryClient } from "@/api/queryClient";
import {
  ErrorAlert,
  ErrorState,
  FormSection,
  LoadingState,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components";
import { attendanceApi } from "@/domains/attendance/api";
import { financeApi } from "@/domains/finance/api";
import type { ExpenseTransactionPayload, IncomeTransactionPayload } from "@/domains/types";
import { formatAmount } from "@/lib/formatters";

interface FinanceEntryPageScreenProps {
  entryType: "income" | "expense";
}

interface EntryFormState {
  fund_account_id: string;
  amount: string;
  transaction_date: string;
  description: string;
  service_event_id: string;
  category_name: string;
  notes: string;
}

const emptyFormState: EntryFormState = {
  fund_account_id: "",
  amount: "",
  transaction_date: new Date().toISOString().slice(0, 10),
  description: "",
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
    service_event_id: formState.service_event_id ? Number(formState.service_event_id) : null,
    category_name: formState.category_name || undefined,
    notes: formState.notes || undefined,
  };
}

export function FinanceEntryPageScreen({ entryType }: FinanceEntryPageScreenProps) {
  const router = useRouter();
  const [formState, setFormState] = useState<EntryFormState>(emptyFormState);
  const isIncome = entryType === "income";

  const fundAccountsQuery = useQuery({
    queryKey: ["finance", "fund-accounts", "active"],
    queryFn: () => financeApi.listFundAccounts({ is_active: true }),
  });

  const serviceEventsQuery = useQuery({
    queryKey: ["attendance", "service-events", "active"],
    queryFn: () => attendanceApi.listServiceEvents({ is_active: true }),
  });

  const submitMutation = useMutation({
    mutationFn: (payload: IncomeTransactionPayload | ExpenseTransactionPayload) =>
      isIncome ? financeApi.recordIncome(payload) : financeApi.recordExpense(payload),
    onSuccess: async (transaction) => {
      await queryClient.invalidateQueries({ queryKey: ["finance"] });
      await queryClient.invalidateQueries({ queryKey: ["reporting"] });
      router.push(`/finance/transactions/${transaction.id}`);
    },
  });

  const fundAccounts = fundAccountsQuery.data ?? [];
  const serviceEvents = serviceEventsQuery.data ?? [];
  const selectedFund = fundAccounts.find((fundAccount) => String(fundAccount.id) === formState.fund_account_id);
  const selectedEvent = serviceEvents.find((serviceEvent) => String(serviceEvent.id) === formState.service_event_id);
  const highlightedFunds = [...fundAccounts].slice(0, 2);
  const hasPreparedForm =
    Boolean(formState.fund_account_id) &&
    Boolean(formState.amount) &&
    Boolean(formState.transaction_date) &&
    Boolean(formState.description.trim());

  const submitLabel = useMemo(() => (isIncome ? "Record income" : "Record expense"), [isIncome]);

  if (fundAccountsQuery.isLoading || serviceEventsQuery.isLoading) {
    return (
      <LoadingState
        description="Fetching active fund accounts and optional service-event references."
        title={`Loading ${entryType} entry form`}
      />
    );
  }

  if (fundAccountsQuery.error || serviceEventsQuery.error) {
    return (
      <ErrorState
        error={fundAccountsQuery.error ?? serviceEventsQuery.error}
        onRetry={() => {
          void fundAccountsQuery.refetch();
          void serviceEventsQuery.refetch();
        }}
        title={`${isIncome ? "Income" : "Expense"} entry could not be prepared`}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link className="button button-secondary" href="/finance">
              Back to ledger
            </Link>
            {isIncome ? (
              <Link className="button button-ghost" href="/finance/transfers/new">
                New transfer
              </Link>
            ) : (
              <Link className="button button-ghost" href="/finance/entries/income">
                Switch to income
              </Link>
            )}
          </div>
        }
        description="Transactions post immediately on save. Use the linked service/event field only when the entry is genuinely tied to a recorded event."
        eyebrow="Finance entries"
        meta={
          <StatusBadge
            label={isIncome ? "Posted income flow" : "Posted expense flow"}
            tone={isIncome ? "success" : "warning"}
          />
        }
        title={isIncome ? "Record income" : "Record expense"}
      />

      {fundAccounts.length === 0 ? (
        <ErrorState
          description="Create baseline fund accounts first through the existing bootstrap/admin flow, then return to this entry form."
          error={new Error("No active fund accounts available.")}
          title="No active fund accounts are available"
        />
      ) : (
        <div className="grid gap-4 items-start grid-cols-1 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] 2xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.75fr)]">
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              submitMutation.mutate(toEntryPayload(formState));
            }}
          >
            <FormSection
              description="Use the posted finance endpoints directly. There is no draft staging layer in the current backend contract."
              title="Entry details"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="field">
                  <span>Fund account</span>
                  <select
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        fund_account_id: event.target.value,
                      }))
                    }
                    required
                    value={formState.fund_account_id}
                  >
                    <option value="">Select fund account</option>
                    {fundAccounts.map((fundAccount) => (
                      <option key={fundAccount.id} value={fundAccount.id}>
                        {fundAccount.name} · {fundAccount.code}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Amount</span>
                  <input
                    min="0.01"
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    required
                    step="0.01"
                    type="number"
                    value={formState.amount}
                  />
                </label>

                <label className="field">
                  <span>Transaction date</span>
                  <input
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        transaction_date: event.target.value,
                      }))
                    }
                    required
                    type="date"
                    value={formState.transaction_date}
                  />
                </label>

                <label className="field">
                  <span>Category</span>
                  <input
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        category_name: event.target.value,
                      }))
                    }
                    placeholder={isIncome ? "Offering, tithe, pledge..." : "Maintenance, welfare, supplies..."}
                    value={formState.category_name}
                  />
                </label>

                <label className="field">
                  <span>Description</span>
                  <input
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    required
                    value={formState.description}
                  />
                </label>

                <label className="field">
                  <span>Linked service/event</span>
                  <select
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        service_event_id: event.target.value,
                      }))
                    }
                    value={formState.service_event_id}
                  >
                    <option value="">No linked event</option>
                    {serviceEvents.map((serviceEvent) => (
                      <option key={serviceEvent.id} value={serviceEvent.id}>
                        {serviceEvent.title} · {serviceEvent.service_date}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="field">
                <span>Notes</span>
                <textarea
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  value={formState.notes}
                />
              </label>
            </FormSection>

            <ErrorAlert
              error={submitMutation.error}
              fallbackMessage={`${isIncome ? "Income" : "Expense"} could not be recorded.`}
            />

            <div className="flex flex-wrap items-center gap-2.5">
              <button className="button button-primary" disabled={submitMutation.isPending} type="submit">
                {submitMutation.isPending ? "Saving..." : submitLabel}
              </button>
              <button className="button button-secondary" onClick={() => setFormState(emptyFormState)} type="button">
                Reset form
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm sticky top-6">
              <div className="section-header">
                <div>
                  <h3>Current fund status</h3>
                  <p className="m-0 text-sm text-slate-500">Use these balances to validate entry destination and amount context.</p>
                </div>
              </div>
              {selectedFund ? (
                <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                  <StatCard label={selectedFund.name} tone="accent" value={formatAmount(selectedFund.current_balance)} />
                </section>
              ) : null}
              <ul className="item-list">
                {highlightedFunds.map((fundAccount) => (
                  <li className="item-row" key={fundAccount.id}>
                    <div>
                      <strong>{fundAccount.name}</strong>
                      <span>{fundAccount.code}</span>
                    </div>
                    <strong>{formatAmount(fundAccount.current_balance)}</strong>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
              <div className="section-header">
                <div>
                  <h3>Journal context</h3>
                  <p className="m-0 text-sm text-slate-500">Operational context for this single posted transaction.</p>
                </div>
              </div>
              <dl className="definition-list">
                <div>
                  <dt>Entry flow</dt>
                  <dd>{isIncome ? "Income posting" : "Expense posting"}</dd>
                </div>
                <div>
                  <dt>Linked event</dt>
                  <dd>{selectedEvent ? selectedEvent.title : "Not linked"}</dd>
                </div>
                <div>
                  <dt>Form readiness</dt>
                  <dd>{hasPreparedForm ? "Ready to post" : "Complete required fields"}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm panel-accent">
              <div className="section-header">
                <div>
                  <h3>Audit tip</h3>
                </div>
              </div>
              <p className="m-0 whitespace-pre-wrap text-sm text-slate-600">
                Use explicit descriptions and category labels so posted records remain traceable without a separate
                transaction revision timeline.
              </p>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
