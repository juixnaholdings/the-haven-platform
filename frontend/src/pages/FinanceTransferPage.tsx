import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import { queryClient } from "../api/queryClient";
import { ErrorAlert } from "../components/ErrorAlert";
import { ErrorState } from "../components/ErrorState";
import { FormSection } from "../components/FormSection";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { attendanceApi } from "../domains/attendance/api";
import { financeApi } from "../domains/finance/api";
import type { TransferTransactionPayload } from "../domains/types";

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

export function FinanceTransferPage() {
  const navigate = useNavigate();
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
      navigate(`/finance/transactions/${transaction.id}`);
    },
  });

  const fundAccounts = fundAccountsQuery.data ?? [];
  const serviceEvents = serviceEventsQuery.data ?? [];

  if (fundAccountsQuery.isLoading || serviceEventsQuery.isLoading) {
    return (
      <LoadingState
        title="Loading transfer form"
        description="Fetching active fund accounts and optional service-event references."
      />
    );
  }

  if (fundAccountsQuery.error || serviceEventsQuery.error) {
    return (
      <ErrorState
        title="Transfer form could not be prepared"
        error={fundAccountsQuery.error ?? serviceEventsQuery.error}
        onRetry={() => {
          void fundAccountsQuery.refetch();
          void serviceEventsQuery.refetch();
        }}
      />
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Finance transfers"
        title="Fund transfer"
        description="This flow creates one balanced transfer transaction with matching OUT and IN ledger lines. The backend still enforces that source and destination funds must differ."
        actions={
          <div className="inline-actions">
            <Link className="button button-secondary" to="/finance">
              Back to ledger
            </Link>
            <Link className="button button-ghost" to="/finance/entries/income">
              Record income instead
            </Link>
          </div>
        }
        meta={<StatusBadge label="Balanced transfer flow" tone="info" />}
      />

      {fundAccounts.length < 2 ? (
        <ErrorState
          title="At least two active funds are required"
          description="Create or activate at least two fund accounts before recording a transfer."
          error={new Error("Insufficient fund accounts for transfer flow.")}
        />
      ) : (
        <form
          className="page-stack"
          onSubmit={(event) => {
            event.preventDefault();
            transferMutation.mutate(toTransferPayload(formState));
          }}
        >
          <FormSection
            title="Transfer details"
            description="Keep the description operationally clear because there is no separate reversal workflow or audit-timeline surface yet."
          >
            <div className="form-grid form-grid-2">
              <label className="field">
                <span>Source fund</span>
                <select
                  required
                  value={formState.source_fund_account_id}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      source_fund_account_id: event.target.value,
                    }))
                  }
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
                  required
                  value={formState.destination_fund_account_id}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      destination_fund_account_id: event.target.value,
                    }))
                  }
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
                  required
                  step="0.01"
                  type="number"
                  value={formState.amount}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Transaction date</span>
                <input
                  required
                  type="date"
                  value={formState.transaction_date}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      transaction_date: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Description</span>
                <input
                  required
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Category</span>
                <input
                  placeholder="Internal transfer, welfare reallocation..."
                  value={formState.category_name}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      category_name: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Linked service/event</span>
                <select
                  value={formState.service_event_id}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      service_event_id: event.target.value,
                    }))
                  }
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
                rows={4}
                value={formState.notes}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
          </FormSection>

          <ErrorAlert error={transferMutation.error} fallbackMessage="The fund transfer could not be recorded." />

          <div className="inline-actions">
            <button className="button button-primary" disabled={transferMutation.isPending} type="submit">
              {transferMutation.isPending ? "Saving..." : "Record transfer"}
            </button>
            <button
              className="button button-secondary"
              onClick={() => setFormState(emptyTransferForm)}
              type="button"
            >
              Reset form
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
