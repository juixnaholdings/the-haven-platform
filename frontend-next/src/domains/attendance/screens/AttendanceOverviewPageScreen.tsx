"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { EmptyState, EntityTable, ErrorState, FilterActionStrip, LoadingState, PageHeader, StatCard, StatusBadge } from "@/components";
import { attendanceApi } from "@/domains/attendance/api";
import { getServiceEventTypeLabel } from "@/domains/attendance/options";
import { reportingApi } from "@/domains/reporting/api";
import { formatDate } from "@/lib/formatters";

export function AttendanceOverviewPageScreen() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

  if (!summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="This overview keeps anonymous summary attendance and member-level attendance explicit as separate but related operational surfaces."
        eyebrow="Attendance overview"
        meta={<StatusBadge label={hasDateFilter ? "Filtered range" : "All-time overview"} tone="info" />}
        title="Attendance"
      />

      {sundayService ? (
        <section className="rounded-3xl border border-blue-200/80 bg-blue-50/60 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label="System Sunday service" tone="info" />
                <StatusBadge
                  label={sundayService.is_active ? "Active event" : "Inactive event"}
                  tone={sundayService.is_active ? "success" : "muted"}
                />
              </div>
              <h3 className="m-0 text-lg font-semibold text-slate-900">{sundayService.title}</h3>
              <p className="m-0 text-sm text-slate-600">
                {formatDate(sundayService.service_date)}
                {sundayService.location ? ` | ${sundayService.location}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link className="button button-primary" href={`/events/${sundayService.id}/attendance`}>
                Take Sunday attendance
              </Link>
              <Link className="button button-secondary" href={`/events/${sundayService.id}`}>
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

      {serviceEvents.length === 0 ? (
        <EmptyState
          action={
            <Link className="button button-primary" href="/events">
              Go to events
            </Link>
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
                      Record attendance
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
    </div>
  );
}
