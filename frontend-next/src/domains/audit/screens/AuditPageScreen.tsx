"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  "settings.staff_user.elevated",
  "settings.staff_role_assignment.updated",
  "settings.staff_invite.created",
  "settings.staff_invite.resent",
  "settings.staff_invite.revoked",
  "settings.staff_invite.accepted",
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
  "staff_invite",
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

function toKnownOrDefault(value: string | null, options: string[]): string {
  if (!value) {
    return "all";
  }
  return options.includes(value) ? value : "all";
}

function formatEventTypeLabel(eventType: string): string {
  if (!eventType) {
    return "Unknown";
  }
  return eventType
    .split(".")
    .map((token) => token.replace(/_/g, " "))
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" / ");
}

function formatTimelineDate(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

function getPayloadSummary(payload: Record<string, unknown>): string {
  const changedFields = payload.changed_fields;
  if (Array.isArray(changedFields) && changedFields.length > 0) {
    return `Changed: ${changedFields.join(", ")}`;
  }

  const lineChanges = payload.line_changes;
  if (Array.isArray(lineChanges) && lineChanges.length > 0) {
    return `${lineChanges.length} line metadata change${lineChanges.length === 1 ? "" : "s"}`;
  }

  if (typeof payload.reference_no === "string" && payload.reference_no) {
    return `Reference: ${payload.reference_no}`;
  }

  if (typeof payload.transaction_type === "string" && payload.transaction_type) {
    return `Transaction type: ${payload.transaction_type}`;
  }

  return "Payload available";
}

export function AuditPageScreen() {
  const searchParams = useSearchParams();
  const [eventTypeFilter, setEventTypeFilter] = useState(() =>
    toKnownOrDefault(searchParams.get("event_type"), AUDIT_EVENT_TYPE_OPTIONS),
  );
  const [targetTypeFilter, setTargetTypeFilter] = useState(() =>
    toKnownOrDefault(searchParams.get("target_type"), AUDIT_TARGET_TYPE_OPTIONS),
  );
  const [textSearch, setTextSearch] = useState(() => searchParams.get("search") ?? "");
  const [actorUsernameFilter, setActorUsernameFilter] = useState(
    () => searchParams.get("actor_username") ?? "",
  );
  const [actorIdFilter, setActorIdFilter] = useState(() => searchParams.get("actor_id") ?? "");
  const [targetIdFilter, setTargetIdFilter] = useState(() => searchParams.get("target_id") ?? "");
  const [startDate, setStartDate] = useState(() => searchParams.get("start_date") ?? "");
  const [endDate, setEndDate] = useState(() => searchParams.get("end_date") ?? "");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedAuditEventId, setSelectedAuditEventId] = useState<number | null>(null);

  const deferredTextSearch = useDeferredValue(textSearch);
  const deferredActorIdFilter = useDeferredValue(actorIdFilter);
  const deferredActorUsernameFilter = useDeferredValue(actorUsernameFilter);
  const deferredTargetIdFilter = useDeferredValue(targetIdFilter);

  const auditEventsQuery = useQuery({
    queryKey: [
      "audit-events",
      {
        deferredTextSearch,
        eventTypeFilter,
        targetTypeFilter,
        deferredActorUsernameFilter,
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
        search: deferredTextSearch || undefined,
        event_type: eventTypeFilter === "all" ? undefined : eventTypeFilter,
        target_type: targetTypeFilter === "all" ? undefined : targetTypeFilter,
        actor_username: deferredActorUsernameFilter || undefined,
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
    Boolean(textSearch.trim()) ||
    eventTypeFilter !== "all" ||
    targetTypeFilter !== "all" ||
    Boolean(actorUsernameFilter.trim()) ||
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
  const timelineGroups = useMemo(() => {
    const groupedEvents = new Map<string, AuditEvent[]>();
    for (const auditEvent of auditEvents) {
      const dateKey = formatTimelineDate(auditEvent.created_at);
      const bucket = groupedEvents.get(dateKey) ?? [];
      bucket.push(auditEvent);
      groupedEvents.set(dateKey, bucket);
    }
    return Array.from(groupedEvents.entries()).map(([dateLabel, events]) => ({
      dateLabel,
      events,
    }));
  }, [auditEvents]);

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
        description="Audit history now supports practical timeline and search filtering, but still does not include export pipelines or anomaly analytics."
        reason="This wave prioritizes practical operational traceability without building a heavyweight forensics subsystem."
        title="Forensics and export workflows"
        tone="info"
      />

      <section className="panel">
        <div className="filters-grid filters-grid-3">
          <label className="field">
            <span>Search</span>
            <input
              onChange={(event) => {
                setTextSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search summary, event type, target, or actor..."
              value={textSearch}
            />
          </label>

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
            <span>Actor username</span>
            <input
              onChange={(event) => {
                setActorUsernameFilter(event.target.value);
                setPage(1);
              }}
              placeholder="e.g. churchadmin"
              value={actorUsernameFilter}
            />
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
              setTextSearch("");
              setEventTypeFilter("all");
              setTargetTypeFilter("all");
              setActorUsernameFilter("");
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
        <div className="grid gap-4 items-start grid-cols-1 2xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.75fr)]">
          <section className="panel">
            <EntityTable
              columns={[
                {
                  header: "Event",
                  cell: (auditEvent) => (
                    <div className="cell-stack">
                      <strong>{auditEvent.summary}</strong>
                      <span className="table-subtext">{formatEventTypeLabel(auditEvent.event_type)}</span>
                    </div>
                  ),
                },
                {
                  header: "Target",
                  cell: (auditEvent) => (
                    <span>
                      {auditEvent.target_type}:{auditEvent.target_id ?? "-"}
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
                  header: "History detail",
                  cell: (auditEvent) => (
                    <span className="table-subtext">{getPayloadSummary(auditEvent.payload)}</span>
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

          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
              <div className="section-header">
                <div>
                  <h3>Activity timeline</h3>
                  <p className="m-0 text-sm text-slate-500">
                    Grouped view of the currently filtered events to help operators scan activity quickly.
                  </p>
                </div>
              </div>
              <ul className="item-list">
                {timelineGroups.map((timelineGroup) => (
                  <li className="item-row" key={timelineGroup.dateLabel}>
                    <div className="grid gap-1">
                      <strong>{timelineGroup.dateLabel}</strong>
                      <span>{timelineGroup.events.length} event(s) captured</span>
                      <span className="table-subtext">
                        Latest: {timelineGroup.events[0]?.summary ?? "No summary"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
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
                {selectedAuditEvent.target_type}:{selectedAuditEvent.target_id ?? "-"}
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
