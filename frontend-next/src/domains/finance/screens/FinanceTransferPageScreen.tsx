"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { queryClient } from "@/api/queryClient";
import { ErrorAlert, ErrorState, FormSection, LoadingState, PageHeader, StatCard, StatusBadge } from "@/components";
import { attendanceApi } from "@/domains/attendance/api";
import { financeApi } from "@/domains/finance/api";
import type { TransferTransactionPayload } from "@/domains/types";
import { formatAmount } from "@/lib/formatters";

interface TransferFormState {
  source_fund_account_id: string;
  destination_fund_account_id: string;
  amount: string;
  transaction_date: string;
  description: string;
  service_event_id: string;
  category_name: string;
  notes: string;
}

const emptyTransferForm: TransferFormState = {
  source_fund_account_id: "",
  destination_fund_account_id: "",
  amount: "",
  transaction_date: new Date().toISOString().slice(0, 10),
  description: "",
  service_event_id: "",
  category_name: "",
  notes: "",
};

function toTransferPayload(formState: TransferFormState): TransferTransactionPayload {
  return {
    source_fund_account_id: Number(formState.source_fund_account_id),
    destination_fund_account_id: Number(formState.destination_fund_account_id),
    amount: formState.amount,
    transaction_date: formState.transaction_date,
    description: formState.description,
    service_event_id: formState.service_event_id ? Number(formState.service_event_id) : null,
    category_name: formState.category_name || undefined,
    notes: formState.notes || undefined,
  };
}

export function FinanceTransferPageScreen() {
  const router = useRouter();
  const [formState, setFormState] = useState<TransferFormState>(emptyTransferForm);

  const fundAccountsQuery = useQuery({
    queryKey: ["finance", "fund-accounts", "active"],
    queryFn: () => financeApi.listFundAccounts({ is_active: true }),
  });

  const serviceEventsQuery = useQuery({
    queryKey: ["attendance", "service-events", "active"],
    queryFn: () => attendanceApi.listServiceEvents({ is_active: true }),
  });

  const transferMutation = useMutation({
    mutationFn: (payload: TransferTransactionPayload) => financeApi.recordTransfer(payload),
    onSuccess: async (transaction) => {
      await queryClient.invalidateQueries({ queryKey: ["finance"] });
      await queryClient.invalidateQueries({ queryKey: ["reporting"] });
      router.push(`/finance/transactions/${transaction.id}`);
    },
  });

  const fundAccounts = fundAccountsQuery.data ?? [];
  const serviceEvents = serviceEventsQuery.data ?? [];
  const sourceFund = fundAccounts.find((fundAccount) => String(fundAccount.id) === formState.source_fund_account_id);
  const destinationFund = fundAccounts.find(
    (fundAccount) => String(fundAccount.id) === formState.destination_fund_account_id,
  );
  const parsedAmount = Number(formState.amount || "0");

  if (fundAccountsQuery.isLoading || serviceEventsQuery.isLoading) {
    return (
      <LoadingState
        description="Fetching active fund accounts and optional service-event references."
        title="Loading transfer form"
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
        title="Transfer form could not be prepared"
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
            <Link className="button button-ghost" href="/finance/entries/income">
              Record income instead
            </Link>
          </div>
        }
        description="This flow creates one balanced transfer transaction with matching OUT and IN ledger lines. The backend still enforces that source and destination funds must differ."
        eyebrow="Finance transfers"
        meta={<StatusBadge label="Balanced transfer flow" tone="info" />}
        title="Fund transfer"
      />

      {fundAccounts.length < 2 ? (
        <ErrorState
          description="Create or activate at least two fund accounts before recording a transfer."
          error={new Error("Insufficient fund accounts for transfer flow.")}
          title="At least two active funds are required"
        />
      ) : (
        <div className="grid gap-4 items-start grid-cols-1 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] 2xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.75fr)]">
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              transferMutation.mutate(toTransferPayload(formState));
            }}
          >
            <FormSection
              description="Keep the description operationally clear because there is no separate reversal workflow or audit-timeline surface yet."
              title="Transfer details"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="field">
                  <span>Source fund</span>
                  <select
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        source_fund_account_id: event.target.value,
                      }))
                    }
                    required
                    value={formState.source_fund_account_id}
                  >
                    <option value="">Select source fund</option>
                    {fundAccounts.map((fundAccount) => (
                      <option key={fundAccount.id} value={fundAccount.id}>
                        {fundAccount.name} · {fundAccount.code}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Destination fund</span>
                  <select
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        destination_fund_account_id: event.target.value,
                      }))
                    }
                    required
                    value={formState.destination_fund_account_id}
                  >
                    <option value="">Select destination fund</option>
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
                  <span>Category</span>
                  <input
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        category_name: event.target.value,
                      }))
                    }
                    placeholder="Internal transfer, welfare reallocation..."
                    value={formState.category_name}
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

            <ErrorAlert error={transferMutation.error} fallbackMessage="The fund transfer could not be recorded." />

            <div className="flex flex-wrap items-center gap-2.5">
              <button className="button button-primary" disabled={transferMutation.isPending} type="submit">
                {transferMutation.isPending ? "Saving..." : "Record transfer"}
              </button>
              <button className="button button-secondary" onClick={() => setFormState(emptyTransferForm)} type="button">
                Reset form
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm sticky top-6">
              <div className="section-header">
                <div>
                  <h3>Transfer outlook</h3>
                  <p className="m-0 text-sm text-slate-500">Preview impact before posting the transfer.</p>
                </div>
              </div>
              <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Source balance"
                  tone="accent"
                  value={sourceFund ? formatAmount(sourceFund.current_balance) : "Select source"}
                />
                <StatCard
                  label="Destination balance"
                  value={destinationFund ? formatAmount(destinationFund.current_balance) : "Select destination"}
                />
              </section>
              {sourceFund && destinationFund && parsedAmount > 0 ? (
                <dl className="definition-list">
                  <div>
                    <dt>Projected source balance</dt>
                    <dd>{formatAmount(Number(sourceFund.current_balance) - parsedAmount)}</dd>
                  </div>
                  <div>
                    <dt>Projected destination balance</dt>
                    <dd>{formatAmount(Number(destinationFund.current_balance) + parsedAmount)}</dd>
                  </div>
                </dl>
              ) : null}
            </section>

            <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
              <div className="section-header">
                <div>
                  <h3>Transfer logic</h3>
                  <p className="m-0 text-sm text-slate-500">Server-side checks that protect posted transfer integrity.</p>
                </div>
              </div>
              <ul className="item-list">
                <li className="item-row">
                  <div>
                    <strong>Balanced double line</strong>
                    <span>Each transfer posts one OUT line and one matching IN line.</span>
                  </div>
                </li>
                <li className="item-row">
                  <div>
                    <strong>Distinct accounts required</strong>
                    <span>Source and destination cannot be the same fund account.</span>
                  </div>
                </li>
                <li className="item-row">
                  <div>
                    <strong>Immediate durability</strong>
                    <span>Transfers are posted immediately; no draft review stage exists.</span>
                  </div>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
