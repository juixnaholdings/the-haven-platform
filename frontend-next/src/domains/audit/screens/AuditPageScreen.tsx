"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  BlockedFeatureCard,
  EmptyState,
  EntityTable,
  ErrorState,
  LoadingState,
  PageHeader,
  PaginationControls,
  StatCard,
  StatusBadge,
} from "@/components";
import { auditApi } from "@/domains/audit/api";
import type { AuditEvent } from "@/domains/types";
import { formatDateTime } from "@/lib/formatters";

const AUDIT_EVENT_TYPE_OPTIONS = [
  "all",
  "member.created",
  "member.updated",
  "household.membership.created",
  "household.membership.updated",
  "group.membership.created",
  "group.membership.updated",
  "attendance.summary.created",
  "attendance.summary.updated",
  "attendance.member.created",
  "attendance.member.updated",
  "finance.transaction.created",
  "finance.transaction.updated",
  "settings.staff_user.created",
  "settings.staff_user.updated",
  "settings.staff_role_assignment.updated",
];

const AUDIT_TARGET_TYPE_OPTIONS = [
  "all",
  "member",
  "household_membership",
  "group_membership",
  "attendance_summary",
  "member_attendance",
  "finance_transaction",
  "staff_user",
];

const EMPTY_AUDIT_EVENTS: AuditEvent[] = [];

function toPositiveIntegerOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return undefined;
  }

  return parsed;
}

export function AuditPageScreen() {
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");
  const [actorIdFilter, setActorIdFilter] = useState("");
  const [targetIdFilter, setTargetIdFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedAuditEventId, setSelectedAuditEventId] = useState<number | null>(null);

  const deferredActorIdFilter = useDeferredValue(actorIdFilter);
  const deferredTargetIdFilter = useDeferredValue(targetIdFilter);

  const auditEventsQuery = useQuery({
    queryKey: [
      "audit-events",
      {
        eventTypeFilter,
        targetTypeFilter,
        deferredActorIdFilter,
        deferredTargetIdFilter,
        startDate,
        endDate,
        page,
        pageSize,
      },
    ],
    queryFn: () =>
      auditApi.listAuditEventsPage({
        event_type: eventTypeFilter === "all" ? undefined : eventTypeFilter,
        target_type: targetTypeFilter === "all" ? undefined : targetTypeFilter,
        actor_id: toPositiveIntegerOrUndefined(deferredActorIdFilter),
        target_id: toPositiveIntegerOrUndefined(deferredTargetIdFilter),
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        page,
        page_size: pageSize,
      }),
  });

  const auditEvents = auditEventsQuery.data?.items ?? EMPTY_AUDIT_EVENTS;
  const auditEventsPagination = auditEventsQuery.data?.pagination ?? null;
  const totalAuditEvents = auditEventsPagination?.count ?? auditEvents.length;
  const hasFilters =
    eventTypeFilter !== "all" ||
    targetTypeFilter !== "all" ||
    Boolean(actorIdFilter.trim()) ||
    Boolean(targetIdFilter.trim()) ||
    Boolean(startDate || endDate);
  const selectedEventStillVisible = selectedAuditEventId
    ? auditEvents.some((auditEvent) => auditEvent.id === selectedAuditEventId)
    : false;
  const effectiveSelectedAuditEventId = selectedEventStillVisible
    ? selectedAuditEventId
    : auditEvents[0]?.id ?? null;
  const selectedAuditEvent = useMemo(
    () => auditEvents.find((auditEvent) => auditEvent.id === effectiveSelectedAuditEventId) ?? null,
    [auditEvents, effectiveSelectedAuditEventId],
  );

  if (auditEventsQuery.isLoading) {
    return (
      <LoadingState
        description="Fetching audit events for operational traceability."
        title="Loading audit trail"
      />
    );
  }

  if (auditEventsQuery.error) {
    return (
      <ErrorState
        error={auditEventsQuery.error}
        onRetry={() => {
          void auditEventsQuery.refetch();
        }}
        title="Audit trail could not be loaded"
      />
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Trace high-value operational mutations across members, households, groups, attendance, finance, and settings administration."
        eyebrow="Audit trail"
        meta={
          <>
            <StatusBadge label="Admin-only" tone="warning" />
            <StatusBadge
              label={`${totalAuditEvents} event${totalAuditEvents === 1 ? "" : "s"}`}
              tone="info"
            />
          </>
        }
        title="Audit events"
      />

      <section className="metrics-grid">
        <StatCard label="Visible events" tone="accent" value={auditEvents.length} />
        <StatCard label="Total in query" value={totalAuditEvents} />
        <StatCard label="Date filtered" value={startDate || endDate ? "Yes" : "No"} />
        <StatCard
          label="Target filtered"
          value={targetTypeFilter === "all" ? "All targets" : targetTypeFilter}
        />
      </section>

      <BlockedFeatureCard
        description="This first audit layer is list-first and queryable, but does not yet include export pipelines, anomaly analytics, or long-form forensic timelines."
        reason="This wave focuses on practical mutation traceability for core operational surfaces."
        title="Forensics and export workflows"
        tone="info"
      />

      <section className="panel">
        <div className="filters-grid filters-grid-3">
          <label className="field">
            <span>Event type</span>
            <select
              onChange={(event) => {
                setEventTypeFilter(event.target.value);
                setPage(1);
              }}
              value={eventTypeFilter}
            >
              {AUDIT_EVENT_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All event types" : option}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Target type</span>
            <select
              onChange={(event) => {
                setTargetTypeFilter(event.target.value);
                setPage(1);
              }}
              value={targetTypeFilter}
            >
              {AUDIT_TARGET_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All target types" : option}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Actor ID</span>
            <input
              onChange={(event) => {
                setActorIdFilter(event.target.value);
                setPage(1);
              }}
              placeholder="e.g. 1"
              value={actorIdFilter}
            />
          </label>

          <label className="field">
            <span>Target ID</span>
            <input
              onChange={(event) => {
                setTargetIdFilter(event.target.value);
                setPage(1);
              }}
              placeholder="e.g. 42"
              value={targetIdFilter}
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
        </div>

        <div className="inline-actions">
          <button
            className="button button-secondary"
            onClick={() => {
              setEventTypeFilter("all");
              setTargetTypeFilter("all");
              setActorIdFilter("");
              setTargetIdFilter("");
              setStartDate("");
              setEndDate("");
              setPage(1);
            }}
            type="button"
          >
            Reset filters
          </button>
        </div>
      </section>

      {auditEvents.length === 0 ? (
        <EmptyState
          description={
            hasFilters
              ? "Try broadening the filter set or clearing date/actor/target constraints."
              : "Audit events will appear as high-value write operations are performed."
          }
          title={hasFilters ? "No audit events matched the current filters" : "No audit events recorded yet"}
        />
      ) : (
        <section className="panel">
          <EntityTable
            columns={[
              {
                header: "Event",
                cell: (auditEvent) => (
                  <div className="cell-stack">
                    <strong>{auditEvent.summary}</strong>
                    <span className="table-subtext">{auditEvent.event_type}</span>
                  </div>
                ),
              },
              {
                header: "Target",
                cell: (auditEvent) => (
                  <span>
                    {auditEvent.target_type}:{auditEvent.target_id ?? "—"}
                  </span>
                ),
              },
              {
                header: "Actor",
                cell: (auditEvent) =>
                  auditEvent.actor ? (
                    <div className="cell-stack">
                      <strong>{auditEvent.actor.full_name}</strong>
                      <span className="table-subtext">@{auditEvent.actor.username}</span>
                    </div>
                  ) : (
                    "System"
                  ),
              },
              {
                header: "Recorded",
                cell: (auditEvent) => formatDateTime(auditEvent.created_at),
              },
              {
                header: "Actions",
                className: "cell-actions",
                cell: (auditEvent) => (
                  <button
                    className={
                      effectiveSelectedAuditEventId === auditEvent.id
                        ? "button button-secondary button-compact"
                        : "button button-ghost button-compact"
                    }
                    onClick={() => setSelectedAuditEventId(auditEvent.id)}
                    type="button"
                  >
                    {effectiveSelectedAuditEventId === auditEvent.id ? "Inspecting" : "Inspect"}
                  </button>
                ),
              },
            ]}
            getRowKey={(auditEvent) => auditEvent.id}
            rows={auditEvents}
          />
          <PaginationControls
            onPageChange={(nextPage) => setPage(nextPage)}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
            pagination={auditEventsPagination}
          />
        </section>
      )}

      {selectedAuditEvent ? (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Event detail</h3>
              <p className="muted-text">
                Event type, target, actor, and compact payload snapshot for operational review.
              </p>
            </div>
          </div>
          <dl className="definition-list">
            <div>
              <dt>Event type</dt>
              <dd>{selectedAuditEvent.event_type}</dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>
                {selectedAuditEvent.target_type}:{selectedAuditEvent.target_id ?? "—"}
              </dd>
            </div>
            <div>
              <dt>Actor</dt>
              <dd>
                {selectedAuditEvent.actor
                  ? `${selectedAuditEvent.actor.full_name} (@${selectedAuditEvent.actor.username})`
                  : "System"}
              </dd>
            </div>
            <div>
              <dt>Recorded</dt>
              <dd>{formatDateTime(selectedAuditEvent.created_at)}</dd>
            </div>
          </dl>

          <div className="page-stack">
            <h4>Payload</h4>
            <pre className="panel-copy">{JSON.stringify(selectedAuditEvent.payload, null, 2)}</pre>
          </div>
        </section>
      ) : null}
    </div>
  );
}
