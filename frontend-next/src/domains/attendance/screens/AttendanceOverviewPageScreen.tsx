"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { EmptyState, EntityTable, ErrorState, FilterActionStrip, LoadingState, PageHeader, StatCard, StatusBadge } from "@/components";
import { attendanceApi } from "@/domains/attendance/api";
import { RecordAttendanceModal } from "@/domains/attendance/components";
import { getServiceEventTypeLabel } from "@/domains/attendance/options";
import type { SundayAttendanceState } from "@/domains/types";
import { reportingApi } from "@/domains/reporting/api";
import { formatDate } from "@/lib/formatters";

const emptySundayServiceSummary = {
  total_services: 0,
  with_summary_count: 0,
  with_member_records_count: 0,
  fully_recorded_count: 0,
  partially_recorded_count: 0,
  not_started_count: 0,
  latest_service: null,
  recent_services: [],
} as const;

function getSundayAttendanceStateMeta(state: SundayAttendanceState) {
  switch (state) {
    case "RECORDED":
      return { label: "Summary and member records captured", tone: "success" as const };
    case "IN_PROGRESS":
      return { label: "Attendance is in progress", tone: "warning" as const };
    default:
      return { label: "Attendance not started", tone: "muted" as const };
  }
}

export function AttendanceOverviewPageScreen() {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isRecordAttendanceModalOpen, setIsRecordAttendanceModalOpen] = useState(false);

  const attendanceSummaryQuery = useQuery({
    queryKey: ["attendance-overview", { startDate, endDate }],
    queryFn: () =>
      reportingApi.getAttendanceSummary({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
  });

  const serviceEventsQuery = useQuery({
    queryKey: ["attendance-overview-events", { startDate, endDate }],
    queryFn: () =>
      attendanceApi.listServiceEvents({
        service_date_from: startDate || undefined,
        service_date_to: endDate || undefined,
      }),
  });

  const sundayServiceQuery = useQuery({
    queryKey: ["attendance-overview-sunday-service-focus"],
    queryFn: () => attendanceApi.getCurrentOrUpcomingSundayService(),
  });

  if (
    attendanceSummaryQuery.isLoading ||
    serviceEventsQuery.isLoading ||
    sundayServiceQuery.isLoading
  ) {
    return (
      <LoadingState
        description="Fetching attendance reporting metrics and service-event records."
        title="Loading attendance overview"
      />
    );
  }

  if (
    attendanceSummaryQuery.error ||
    serviceEventsQuery.error ||
    sundayServiceQuery.error
  ) {
    return (
      <ErrorState
        error={attendanceSummaryQuery.error ?? serviceEventsQuery.error ?? sundayServiceQuery.error}
        onRetry={() => {
          void attendanceSummaryQuery.refetch();
          void serviceEventsQuery.refetch();
          void sundayServiceQuery.refetch();
        }}
        title="Attendance overview could not be loaded"
      />
    );
  }

  const summary = attendanceSummaryQuery.data;
  const serviceEvents = serviceEventsQuery.data ?? [];
  const sundayService = sundayServiceQuery.data ?? null;
  const hasDateFilter = Boolean(startDate || endDate);
  const sundayActionLabel = sundayService
    ? sundayService.has_attendance_summary || sundayService.member_attendance_count > 0
      ? "Continue Sunday attendance"
      : "Take Sunday attendance"
    : "Sunday attendance";

  if (!summary) {
    return null;
  }

  const sundayServiceSummary = summary.sunday_services ?? emptySundayServiceSummary;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="button button-primary"
              onClick={() => setIsRecordAttendanceModalOpen(true)}
              type="button"
            >
              Record attendance
            </button>
            <Link className="button button-secondary" href="/events">
              View events
            </Link>
          </div>
        }
        description="This overview keeps anonymous summary attendance and member-level attendance explicit as separate but related operational surfaces."
        eyebrow="Attendance overview"
        meta={<StatusBadge label={hasDateFilter ? "Filtered range" : "All-time overview"} tone="info" />}
        title="Attendance"
      />

      {sundayService ? (
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label="System Sunday service" tone="info" />
                <StatusBadge
                  label={sundayService.is_active ? "Active event" : "Inactive event"}
                  tone={sundayService.is_active ? "success" : "muted"}
                />
                <StatusBadge
                  label={sundayService.has_attendance_summary ? "Summary recorded" : "Summary pending"}
                  tone={sundayService.has_attendance_summary ? "success" : "warning"}
                />
                <StatusBadge
                  label={
                    sundayService.member_attendance_count > 0
                      ? `${sundayService.member_attendance_count} member record${sundayService.member_attendance_count === 1 ? "" : "s"}`
                      : "No member records yet"
                  }
                  tone={sundayService.member_attendance_count > 0 ? "info" : "muted"}
                />
              </div>
              <h3 className="m-0 text-lg font-semibold text-slate-900">{sundayService.title}</h3>
              <p className="m-0 text-sm text-slate-600">
                {formatDate(sundayService.service_date)}
                {sundayService.location ? ` | ${sundayService.location}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                className="button button-primary"
                onClick={() => setIsRecordAttendanceModalOpen(true)}
                type="button"
              >
                Record attendance
              </button>
              <Link className="button button-secondary" href={`/events/${sundayService.id}/attendance`}>
                {sundayActionLabel}
              </Link>
              <Link className="button button-ghost" href={`/events/${sundayService.id}`}>
                View Sunday event
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <FilterActionStrip
          actions={
            <button
              className="button button-secondary"
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              type="button"
            >
              Reset range
            </button>
          }
          filters={
            <label className="field">
              <span>End date</span>
              <input onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
            </label>
          }
          search={
            <label className="field">
              <span>Start date</span>
              <input onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
            </label>
          }
        />

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>How to read this page</h3>
              <p className="m-0 text-sm text-slate-500">The backend intentionally keeps the two attendance surfaces separate.</p>
            </div>
          </div>
          <ul className="item-list">
            <li className="item-row">
              <div>
                <strong>Anonymous summary</strong>
                <span>Aggregate headcounts across men, women, children, and visitors.</span>
              </div>
            </li>
            <li className="item-row">
              <div>
                <strong>Member attendance rows</strong>
                <span>Per-member status records used during the event attendance workflow.</span>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Events in range" tone="accent" value={summary.total_events} />
        <StatCard label="Aggregate attendance" value={summary.aggregate_total_attendance} />
        <StatCard label="Visitors" value={summary.aggregate_visitor_count} />
        <StatCard label="Member records" value={summary.total_member_attendance_records} />
        <StatCard label="System Sundays in range" value={sundayServiceSummary.total_services} />
        <StatCard label="Sundays fully recorded" value={sundayServiceSummary.fully_recorded_count} />
      </section>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Attendance breakdown</h3>
              <p className="m-0 text-sm text-slate-500">Anonymous summary totals across the selected date range.</p>
            </div>
          </div>
          <dl className="definition-list">
            <div>
              <dt>Men</dt>
              <dd>{summary.aggregate_men_count}</dd>
            </div>
            <div>
              <dt>Women</dt>
              <dd>{summary.aggregate_women_count}</dd>
            </div>
            <div>
              <dt>Children</dt>
              <dd>{summary.aggregate_children_count}</dd>
            </div>
            <div>
              <dt>Visitors</dt>
              <dd>{summary.aggregate_visitor_count}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Event type counts</h3>
              <p className="m-0 text-sm text-slate-500">Counts of events by current backend event-type classification.</p>
            </div>
          </div>
          {summary.event_type_counts.length === 0 ? (
            <EmptyState
              description="Create events and record attendance to populate the reporting breakdown."
              title="No event-type counts yet"
            />
          ) : (
            <ul className="item-list">
              {summary.event_type_counts.map((eventTypeCount) => (
                <li className="item-row" key={eventTypeCount.event_type}>
                  <div>
                    <strong>{getServiceEventTypeLabel(eventTypeCount.event_type)}</strong>
                  </div>
                  <strong>{eventTypeCount.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {sundayServiceSummary.recent_services.length > 0 ? (
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Recent Sunday tracking</h3>
              <p className="m-0 text-sm text-slate-500">
                Track whether Sunday attendance has started and open the right workflow quickly.
              </p>
            </div>
          </div>
          <EntityTable
            columns={[
              {
                header: "Sunday service",
                cell: (serviceEvent) => (
                  <div className="grid gap-1">
                    <Link className="font-semibold text-[#16335f] hover:underline" href={`/events/${serviceEvent.id}`}>
                      {serviceEvent.title}
                    </Link>
                    <span className="block text-xs text-slate-500">{formatDate(serviceEvent.service_date)}</span>
                  </div>
                ),
              },
              {
                header: "Progress",
                cell: (serviceEvent) => {
                  const state = getSundayAttendanceStateMeta(serviceEvent.attendance_state);
                  return <StatusBadge label={state.label} tone={state.tone} />;
                },
              },
              {
                header: "Summary total",
                cell: (serviceEvent) => serviceEvent.summary_total_count || "-",
              },
              {
                header: "Member records",
                cell: (serviceEvent) => serviceEvent.member_attendance_count,
              },
              {
                header: "Actions",
                className: "cell-actions",
                cell: (serviceEvent) => (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link className="button button-secondary button-compact" href={`/events/${serviceEvent.id}`}>
                      View
                    </Link>
                    <Link
                      className="button button-ghost button-compact"
                      href={`/events/${serviceEvent.id}/attendance`}
                    >
                      {serviceEvent.attendance_state === "NOT_STARTED" ? "Take attendance" : "Continue"}
                    </Link>
                  </div>
                ),
              },
            ]}
            getRowKey={(serviceEvent) => serviceEvent.id}
            rows={sundayServiceSummary.recent_services}
          />
        </section>
      ) : null}

      {serviceEvents.length === 0 ? (
        <EmptyState
          action={
            <button
              className="button button-primary"
              onClick={() => setIsRecordAttendanceModalOpen(true)}
              type="button"
            >
              Record attendance
            </button>
          }
          description={
            hasDateFilter
              ? "Try expanding the date range."
              : "Create a service event first, then use the attendance workflow to record summary and member attendance."
          }
          title={hasDateFilter ? "No events in the selected range" : "No events available for attendance yet"}
        />
      ) : (
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Recent events</h3>
              <p className="m-0 text-sm text-slate-500">Open the event detail or direct attendance recording workflow from here.</p>
            </div>
          </div>
          <EntityTable
            columns={[
              {
                header: "Event",
                cell: (serviceEvent) => (
                  <div className="grid gap-1">
                    <Link className="font-semibold text-[#16335f] hover:underline" href={`/events/${serviceEvent.id}`}>
                      {serviceEvent.title}
                    </Link>
                    <span className="block text-xs text-slate-500">
                      {getServiceEventTypeLabel(serviceEvent.event_type)} | {formatDate(serviceEvent.service_date)}
                    </span>
                    {serviceEvent.is_system_managed ? (
                      <StatusBadge label="System-managed Sunday" tone="info" />
                    ) : null}
                  </div>
                ),
              },
              {
                header: "Summary",
                cell: (serviceEvent) => (
                  <StatusBadge
                    label={serviceEvent.has_attendance_summary ? "Recorded" : "Pending"}
                    tone={serviceEvent.has_attendance_summary ? "success" : "warning"}
                  />
                ),
              },
              {
                header: "Member records",
                cell: (serviceEvent) => serviceEvent.member_attendance_count,
              },
              {
                header: "Actions",
                className: "cell-actions",
                cell: (serviceEvent) => (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link className="button button-secondary button-compact" href={`/events/${serviceEvent.id}`}>
                      View
                    </Link>
                    <Link
                      className="button button-ghost button-compact"
                      href={`/events/${serviceEvent.id}/attendance`}
                    >
                      {serviceEvent.has_attendance_summary || serviceEvent.member_attendance_count > 0
                        ? "Continue"
                        : "Take attendance"}
                    </Link>
                  </div>
                ),
              },
            ]}
            getRowKey={(serviceEvent) => serviceEvent.id}
            rows={serviceEvents}
          />
        </section>
      )}

      <RecordAttendanceModal
        isOpen={isRecordAttendanceModalOpen}
        onClose={() => setIsRecordAttendanceModalOpen(false)}
        onCompleted={(serviceEvent) => {
          router.push(`/events/${serviceEvent.id}/attendance`);
        }}
      />
    </div>
  );
}
