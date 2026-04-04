"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { queryClient } from "@/api/queryClient";
import {
  BlockedFeatureCard,
  EmptyState,
  EntityTable,
  ErrorAlert,
  ErrorState,
  FormModalShell,
  FormSection,
  LoadingState,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components";
import { attendanceApi } from "@/domains/attendance/api";
import { financeApi } from "@/domains/finance/api";
import { getLedgerDirectionLabel, getTransactionTypeLabel } from "@/domains/finance/options";
import type { TransactionLineMetadataUpdate, TransactionUpdatePayload } from "@/domains/types";
import { formatAmount, formatDate, formatDateTime } from "@/lib/formatters";

interface TransactionMetadataFormState {
  transaction_date: string;
  description: string;
  external_reference: string;
  service_event_id: string;
}

const emptyMetadataForm: TransactionMetadataFormState = {
  transaction_date: "",
  description: "",
  external_reference: "",
  service_event_id: "",
};

function toMetadataPayload(
  formState: TransactionMetadataFormState,
  baseFormState: TransactionMetadataFormState,
  lineUpdates: TransactionLineMetadataUpdate[],
): TransactionUpdatePayload {
  const payload: TransactionUpdatePayload = {};

  if (formState.transaction_date !== baseFormState.transaction_date) {
    payload.transaction_date = formState.transaction_date;
  }
  if (formState.description !== baseFormState.description) {
    payload.description = formState.description;
  }
  if (formState.external_reference !== baseFormState.external_reference) {
    payload.external_reference = formState.external_reference;
  }
  if (formState.service_event_id !== baseFormState.service_event_id) {
    payload.service_event_id = formState.service_event_id ? Number(formState.service_event_id) : null;
  }
  if (lineUpdates.length > 0) {
    payload.line_updates = lineUpdates;
  }

  return payload;
}

export function TransactionDetailPageScreen() {
  const params = useParams<{ transactionId: string }>();
  const numericTransactionId = Number(params.transactionId);
  const [formOverrides, setFormOverrides] = useState<Partial<TransactionMetadataFormState>>({});
  const [lineDrafts, setLineDrafts] = useState<Record<number, { category_name: string; notes: string }>>({});
  const [isMetadataUpdateConfirmed, setIsMetadataUpdateConfirmed] = useState(false);
  const [isMetadataModalOpen, setIsMetadataModalOpen] = useState(false);

  const transactionQuery = useQuery({
    enabled: Number.isFinite(numericTransactionId),
    queryKey: ["finance", "transaction", numericTransactionId],
    queryFn: () => financeApi.getTransaction(numericTransactionId),
  });

  const serviceEventsQuery = useQuery({
    queryKey: ["attendance", "service-events"],
    queryFn: () => attendanceApi.listServiceEvents(),
  });

  const baseMetadataForm = useMemo<TransactionMetadataFormState>(() => {
    if (!transactionQuery.data) {
      return emptyMetadataForm;
    }

    return {
      transaction_date: transactionQuery.data.transaction_date,
      description: transactionQuery.data.description,
      external_reference: transactionQuery.data.external_reference,
      service_event_id: transactionQuery.data.service_event?.id
        ? String(transactionQuery.data.service_event.id)
        : "",
    };
  }, [transactionQuery.data]);

  const formState = useMemo<TransactionMetadataFormState>(
    () => ({
      ...baseMetadataForm,
      ...formOverrides,
    }),
    [baseMetadataForm, formOverrides],
  );

  const lineUpdates = useMemo<TransactionLineMetadataUpdate[]>(() => {
    if (!transactionQuery.data) {
      return [];
    }

    return transactionQuery.data.lines.flatMap((line) => {
      const draft = lineDrafts[line.id];
      if (!draft) {
        return [];
      }

      const update: TransactionLineMetadataUpdate = { id: line.id };
      if (draft.category_name !== line.category_name) {
        update.category_name = draft.category_name;
      }
      if (draft.notes !== line.notes) {
        update.notes = draft.notes;
      }
      return update.category_name !== undefined || update.notes !== undefined ? [update] : [];
    });
  }, [lineDrafts, transactionQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (payload: TransactionUpdatePayload) =>
      financeApi.updateTransaction(numericTransactionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["finance"] });
      await queryClient.invalidateQueries({ queryKey: ["reporting"] });
      await queryClient.invalidateQueries({ queryKey: ["finance", "transaction", numericTransactionId] });
      setFormOverrides({});
      setLineDrafts({});
      setIsMetadataUpdateConfirmed(false);
      setIsMetadataModalOpen(false);
    },
  });

  const lineCount = useMemo(() => transactionQuery.data?.lines.length ?? 0, [transactionQuery.data?.lines]);

  if (!Number.isFinite(numericTransactionId)) {
    return (
      <ErrorState
        description="The requested transaction identifier is not valid."
        error={new Error("Invalid transaction identifier.")}
        title="Transaction route is invalid"
      />
    );
  }

  if (transactionQuery.isLoading || serviceEventsQuery.isLoading) {
    return (
      <LoadingState
        description="Fetching current transaction metadata and ledger lines."
        title="Loading transaction detail"
      />
    );
  }

  if (transactionQuery.error || serviceEventsQuery.error || !transactionQuery.data) {
    return (
      <ErrorState
        error={transactionQuery.error ?? serviceEventsQuery.error ?? new Error("Transaction not found.")}
        onRetry={() => {
          void transactionQuery.refetch();
          void serviceEventsQuery.refetch();
        }}
        title="Transaction detail could not be loaded"
      />
    );
  }

  const transaction = transactionQuery.data;
  const serviceEvents = serviceEventsQuery.data ?? [];
  const hasMetadataChanges =
    formState.transaction_date !== baseMetadataForm.transaction_date ||
    formState.description !== baseMetadataForm.description ||
    formState.external_reference !== baseMetadataForm.external_reference ||
    formState.service_event_id !== baseMetadataForm.service_event_id;
  const hasLineChanges = lineUpdates.length > 0;
  const hasPendingChanges = hasMetadataChanges || hasLineChanges;
  const closeMetadataModal = () => {
    setFormOverrides({});
    setLineDrafts({});
    setIsMetadataUpdateConfirmed(false);
    setIsMetadataModalOpen(false);
    updateMutation.reset();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="button button-primary"
              onClick={() => {
                setIsMetadataUpdateConfirmed(false);
                updateMutation.reset();
                setIsMetadataModalOpen(true);
              }}
              type="button"
            >
              Edit metadata
            </button>
            <Link className="button button-secondary" href="/finance">
              Back to ledger
            </Link>
            {transaction.service_event ? (
              <Link className="button button-ghost" href={`/events/${transaction.service_event.id}`}>
                View linked event
              </Link>
            ) : null}
          </div>
        }
        description="This page shows the current posted transaction record. There is no separate audit-timeline endpoint yet, so metadata and ledger lines are presented directly."
        eyebrow="Finance / transaction detail"
        meta={
          <>
            <StatusBadge label={getTransactionTypeLabel(transaction.transaction_type)} tone="info" />
            <StatusBadge label="Posted record" tone="success" />
          </>
        }
        title={transaction.reference_no}
      />

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total in" tone="accent" value={formatAmount(transaction.total_in_amount)} />
        <StatCard label="Total out" value={formatAmount(transaction.total_out_amount)} />
        <StatCard label="Ledger lines" value={lineCount} />
        <StatCard label="Posted at" value={formatDate(transaction.posted_at)} />
      </section>

      <div className="grid gap-4 items-start grid-cols-1 2xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.75fr)]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
            <div className="section-header">
              <div>
                <h3>Record metadata</h3>
                <p className="m-0 text-sm text-slate-500">Current transaction-level metadata exposed by the backend.</p>
              </div>
            </div>
            <dl className="grid gap-3.5 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <dt>Description</dt>
                <dd>{transaction.description}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <dt>External reference</dt>
                <dd>{transaction.external_reference || "Not set"}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <dt>Transaction date</dt>
                <dd>{formatDate(transaction.transaction_date)}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <dt>Linked event</dt>
                <dd>{transaction.service_event?.title || "Not linked"}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <dt>Primary category</dt>
                <dd>{transaction.primary_category || "Not categorized"}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <dt>Line notes</dt>
                <dd>{transaction.has_line_notes ? "Available" : "Not set"}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <dt>Last updated</dt>
                <dd>{formatDateTime(transaction.updated_at)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
            <div className="section-header">
              <div>
                <h3>Metadata actions</h3>
                <p className="m-0 text-sm text-slate-500">
                  Use the modal editor for safe operational metadata updates.
                </p>
              </div>
              <button
                className="button button-primary"
                onClick={() => {
                  setIsMetadataUpdateConfirmed(false);
                  updateMutation.reset();
                  setIsMetadataModalOpen(true);
                }}
                type="button"
              >
                Edit metadata
              </button>
            </div>
          </section>

          {transaction.lines.length === 0 ? (
            <EmptyState
              description="This should not happen for a posted transaction, so treat it as a backend integrity issue."
              title="No ledger lines are attached"
            />
          ) : (
            <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
              <div className="section-header">
                <div>
                  <h3>Ledger lines</h3>
                  <p className="m-0 text-sm text-slate-500">
                    Underlying posted lines used to derive balances and transaction totals.
                  </p>
                </div>
              </div>

              <EntityTable
                columns={[
                  {
                    header: "Fund account",
                    cell: (line) => (
                      <div className="grid gap-1">
                        <strong>{line.fund_account_name}</strong>
                        <span className="block text-xs text-slate-500">{line.fund_account_code}</span>
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
                    cell: (line) => line.notes || "-",
                  },
                ]}
                getRowKey={(line) => line.id}
                rows={transaction.lines}
              />
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
            <div className="section-header">
              <div>
                <h3>Record posture</h3>
                <p className="m-0 text-sm text-slate-500">What is available in this release-ready finance surface.</p>
              </div>
            </div>
            <ul className="item-list">
              <li className="item-row">
                <div>
                  <strong>Safe metadata edits only</strong>
                  <span>
                    Description, date, and linked event can be updated. Ledger lines are durable posted records.
                  </span>
                </div>
              </li>
              <li className="item-row">
                <div>
                  <strong>No revision timeline</strong>
                  <span>
                    The backend currently exposes record timestamps, not a step-by-step audit event log.
                  </span>
                </div>
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <FormModalShell
        description="Use this only for safe operational metadata changes. Posted ledger lines themselves are not editable here."
        isOpen={isMetadataModalOpen}
        onClose={closeMetadataModal}
        size="large"
        title="Update transaction metadata"
      >
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            updateMutation.mutate(toMetadataPayload(formState, baseMetadataForm, lineUpdates));
          }}
        >
          <FormSection title="Metadata details">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field">
                <span>Transaction date</span>
                <input
                  onChange={(event) =>
                    setFormOverrides((current) => ({
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
                <span>Linked service/event</span>
                <select
                  onChange={(event) =>
                    setFormOverrides((current) => ({
                      ...current,
                      service_event_id: event.target.value,
                    }))
                  }
                  value={formState.service_event_id}
                >
                  <option value="">No linked event</option>
                  {serviceEvents.map((serviceEvent) => (
                    <option key={serviceEvent.id} value={serviceEvent.id}>
                      {serviceEvent.title} - {serviceEvent.service_date}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>External reference</span>
                <input
                  onChange={(event) =>
                    setFormOverrides((current) => ({
                      ...current,
                      external_reference: event.target.value,
                    }))
                  }
                  placeholder="Bank ref, voucher no, receipt no..."
                  value={formState.external_reference}
                />
              </label>
            </div>

            <label className="field">
              <span>Description</span>
              <textarea
                onChange={(event) =>
                  setFormOverrides((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
                value={formState.description}
              />
            </label>
          </FormSection>

          <FormSection
            description="Category and notes can be corrected per ledger line without changing line amounts or directions."
            title="Ledger line metadata"
          >
            <div className="space-y-4">
              {transaction.lines.map((line) => (
                <div
                  className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4"
                  key={line.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong className="text-sm text-slate-900">{line.fund_account_name}</strong>
                      <p className="m-0 text-xs text-slate-500">
                        {line.fund_account_code} - {getLedgerDirectionLabel(line.direction)} -{" "}
                        {formatAmount(line.amount)}
                      </p>
                    </div>
                    <StatusBadge
                      label={line.direction === "IN" ? "In flow" : "Out flow"}
                      tone={line.direction === "IN" ? "success" : "warning"}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="field">
                      <span>Category</span>
                      <input
                        onChange={(event) =>
                          setLineDrafts((current) => ({
                            ...current,
                            [line.id]: {
                              category_name: event.target.value,
                              notes: current[line.id]?.notes ?? line.notes,
                            },
                          }))
                        }
                        placeholder="Offering, utilities, support..."
                        value={lineDrafts[line.id]?.category_name ?? line.category_name}
                      />
                    </label>

                    <label className="field">
                      <span>Notes</span>
                      <textarea
                        onChange={(event) =>
                          setLineDrafts((current) => ({
                            ...current,
                            [line.id]: {
                              category_name: current[line.id]?.category_name ?? line.category_name,
                              notes: event.target.value,
                            },
                          }))
                        }
                        rows={3}
                        value={lineDrafts[line.id]?.notes ?? line.notes}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </FormSection>

          <label className="inline-flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm text-slate-700">
            <input
              checked={isMetadataUpdateConfirmed}
              className="mt-1 size-4 rounded border-slate-300 text-[#16335f] focus:ring-[#16335f]"
              onChange={(event) => setIsMetadataUpdateConfirmed(event.target.checked)}
              type="checkbox"
            />
            <span>I confirm these metadata corrections are accurate for this posted transaction.</span>
          </label>

          {!hasPendingChanges ? (
            <p className="m-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              No pending changes detected. Update a field to enable save.
            </p>
          ) : null}

          <ErrorAlert
            error={updateMutation.error}
            fallbackMessage="The transaction metadata could not be updated."
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="button button-primary"
              disabled={updateMutation.isPending || !hasPendingChanges || !isMetadataUpdateConfirmed}
              type="submit"
            >
              {updateMutation.isPending ? "Saving..." : "Save metadata changes"}
            </button>
            <button className="button button-secondary" onClick={closeMetadataModal} type="button">
              Cancel
            </button>
          </div>
        </form>
      </FormModalShell>

      <BlockedFeatureCard
        action={
          <Link className="button button-secondary" href="/finance">
            Return to ledger
          </Link>
        }
        description="A reversal or void flow is intentionally not exposed by the current backend."
        reason="Reversal and audit-trail behavior require a dedicated finance and audit subsystem slice."
        title="Reversal requests"
      />

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Available timeline fields</h3>
            <p className="m-0 text-sm text-slate-500">Current record timestamps exposed by the API.</p>
          </div>
        </div>
        <dl className="definition-list">
          <div>
            <dt>Created at</dt>
            <dd>{formatDateTime(transaction.created_at)}</dd>
          </div>
          <div>
            <dt>Updated at</dt>
            <dd>{formatDateTime(transaction.updated_at)}</dd>
          </div>
          <div>
            <dt>Posted at</dt>
            <dd>{formatDateTime(transaction.posted_at)}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
