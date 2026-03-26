import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { queryClient } from "../api/queryClient";
import { ErrorAlert } from "../components/ErrorAlert";
import { EmptyState } from "../components/EmptyState";
import { EntityTable } from "../components/EntityTable";
import { ErrorState } from "../components/ErrorState";
import { FormSection } from "../components/FormSection";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { attendanceApi } from "../domains/attendance/api";
import { financeApi } from "../domains/finance/api";
import {
  getLedgerDirectionLabel,
  getTransactionTypeLabel,
} from "../domains/finance/options";
import type { TransactionUpdatePayload } from "../domains/types";
import { formatAmount, formatDate, formatDateTime } from "../utils/formatters";

interface TransactionMetadataFormState {
  transaction_date: string;
  description: string;
  service_event_id: string;
}

const emptyMetadataForm: TransactionMetadataFormState = {
  transaction_date: "",
  description: "",
  service_event_id: "",
};

function toMetadataPayload(formState: TransactionMetadataFormState): TransactionUpdatePayload {
  return {
    transaction_date: formState.transaction_date || undefined,
    description: formState.description || undefined,
    service_event_id: formState.service_event_id ? Number(formState.service_event_id) : null,
  };
}

export function TransactionDetailPage() {
  const { transactionId } = useParams();
  const numericTransactionId = Number(transactionId);
  const [formState, setFormState] = useState<TransactionMetadataFormState>(emptyMetadataForm);

  const transactionQuery = useQuery({
    enabled: Number.isFinite(numericTransactionId),
    queryKey: ["finance", "transaction", numericTransactionId],
    queryFn: () => financeApi.getTransaction(numericTransactionId),
  });

  const serviceEventsQuery = useQuery({
    queryKey: ["attendance", "service-events"],
    queryFn: () => attendanceApi.listServiceEvents(),
  });

  useEffect(() => {
    if (!transactionQuery.data) {
      return;
    }

    setFormState({
      transaction_date: transactionQuery.data.transaction_date,
      description: transactionQuery.data.description,
      service_event_id: transactionQuery.data.service_event?.id
        ? String(transactionQuery.data.service_event.id)
        : "",
    });
  }, [transactionQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (payload: TransactionUpdatePayload) =>
      financeApi.updateTransaction(numericTransactionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance"] });
      await queryClient.invalidateQueries({ queryKey: ["reporting"] });
    },
  });

  const lineCount = useMemo(
    () => transactionQuery.data?.lines.length ?? 0,
    [transactionQuery.data?.lines],
  );

  if (!Number.isFinite(numericTransactionId)) {
    return (
      <ErrorState
        title="Transaction route is invalid"
        description="The requested transaction identifier is not valid."
        error={new Error("Invalid transaction identifier.")}
      />
    );
  }

  if (transactionQuery.isLoading || serviceEventsQuery.isLoading) {
    return (
      <LoadingState
        title="Loading transaction detail"
        description="Fetching current transaction metadata and ledger lines."
      />
    );
  }

  if (transactionQuery.error || serviceEventsQuery.error || !transactionQuery.data) {
    return (
      <ErrorState
        title="Transaction detail could not be loaded"
        error={transactionQuery.error ?? serviceEventsQuery.error ?? new Error("Transaction not found.")}
        onRetry={() => {
          void transactionQuery.refetch();
          void serviceEventsQuery.refetch();
        }}
      />
    );
  }

  const transaction = transactionQuery.data;
  const serviceEvents = serviceEventsQuery.data ?? [];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Finance / transaction detail"
        title={transaction.reference_no}
        description="This page shows the current posted transaction record. There is no separate audit-timeline endpoint yet, so metadata and ledger lines are presented directly."
        actions={
          <div className="inline-actions">
            <Link className="button button-secondary" to="/finance">
              Back to ledger
            </Link>
            {transaction.service_event ? (
              <Link className="button button-ghost" to={`/events/${transaction.service_event.id}`}>
                View linked event
              </Link>
            ) : null}
          </div>
        }
        meta={
          <>
            <StatusBadge label={getTransactionTypeLabel(transaction.transaction_type)} tone="info" />
            <StatusBadge label="Posted record" tone="success" />
          </>
        }
      />

      <section className="metrics-grid">
        <StatCard label="Total in" value={formatAmount(transaction.total_in_amount)} tone="accent" />
        <StatCard label="Total out" value={formatAmount(transaction.total_out_amount)} />
        <StatCard label="Ledger lines" value={lineCount} />
        <StatCard label="Posted at" value={formatDate(transaction.posted_at)} />
      </section>

      <div className="panel-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Record metadata</h3>
              <p className="muted-text">Current transaction-level metadata exposed by the backend.</p>
            </div>
          </div>
          <dl className="detail-grid detail-grid-2">
            <div className="detail-item">
              <dt>Description</dt>
              <dd>{transaction.description}</dd>
            </div>
            <div className="detail-item">
              <dt>Transaction date</dt>
              <dd>{formatDate(transaction.transaction_date)}</dd>
            </div>
            <div className="detail-item">
              <dt>Linked event</dt>
              <dd>{transaction.service_event?.title || "Not linked"}</dd>
            </div>
            <div className="detail-item">
              <dt>Last updated</dt>
              <dd>{formatDateTime(transaction.updated_at)}</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Current limitation</h3>
              <p className="muted-text">What this screen can and cannot show honestly today.</p>
            </div>
          </div>
          <ul className="item-list">
            <li className="item-row">
              <div>
                <strong>Safe metadata edits only</strong>
                <span>Description, date, and linked event can be updated. Ledger lines are durable posted records.</span>
              </div>
            </li>
            <li className="item-row">
              <div>
                <strong>No audit timeline</strong>
                <span>The backend does not expose a revision history or event timeline for transactions yet.</span>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <form
        className="page-stack"
        onSubmit={(event) => {
          event.preventDefault();
          updateMutation.mutate(toMetadataPayload(formState));
        }}
      >
        <FormSection
          title="Update transaction metadata"
          description="Use this only for safe operational metadata changes. Posted ledger lines themselves are not editable here."
        >
          <div className="form-grid form-grid-2">
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
            <span>Description</span>
            <textarea
              rows={4}
              value={formState.description}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>
        </FormSection>

        <ErrorAlert error={updateMutation.error} fallbackMessage="The transaction metadata could not be updated." />

        <div className="inline-actions">
          <button className="button button-primary" disabled={updateMutation.isPending} type="submit">
            {updateMutation.isPending ? "Saving..." : "Save metadata changes"}
          </button>
        </div>
      </form>

      {transaction.lines.length === 0 ? (
        <EmptyState
          title="No ledger lines are attached"
          description="This should not happen for a posted transaction, so treat it as a backend integrity issue."
        />
      ) : (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Ledger lines</h3>
              <p className="muted-text">Underlying posted lines used to derive balances and transaction totals.</p>
            </div>
          </div>

          <EntityTable
            columns={[
              {
                header: "Fund account",
                cell: (line) => (
                  <div className="cell-stack">
                    <strong>{line.fund_account_name}</strong>
                    <span className="table-subtext">{line.fund_account_code}</span>
                  </div>
                ),
              },
              {
                header: "Direction",
                cell: (line) => (
                  <StatusBadge
                    label={getLedgerDirectionLabel(line.direction)}
                    tone={line.direction === "IN" ? "success" : "warning"}
                  />
                ),
              },
              {
                header: "Amount",
                cell: (line) => formatAmount(line.amount),
              },
              {
                header: "Category",
                cell: (line) => line.category_name || "Not set",
              },
              {
                header: "Notes",
                cell: (line) => line.notes || "—",
              },
            ]}
            getRowKey={(line) => line.id}
            rows={transaction.lines}
          />
        </section>
      )}
    </div>
  );
}
