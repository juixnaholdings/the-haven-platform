import { useState } from "react";
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
import { attendanceApi } from "../domains/attendance/api";
import { getServiceEventTypeLabel } from "../domains/attendance/options";
import { reportingApi } from "../domains/reporting/api";
import { formatDate } from "../utils/formatters";

export function AttendancePage() {
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

  if (attendanceSummaryQuery.isLoading || serviceEventsQuery.isLoading) {
    return (
      <LoadingState
        title="Loading attendance overview"
        description="Fetching attendance reporting metrics and service-event records."
      />
    );
  }

  if (attendanceSummaryQuery.error || serviceEventsQuery.error) {
    return (
      <ErrorState
        title="Attendance overview could not be loaded"
        error={attendanceSummaryQuery.error ?? serviceEventsQuery.error}
        onRetry={() => {
          void attendanceSummaryQuery.refetch();
          void serviceEventsQuery.refetch();
        }}
      />
    );
  }

  const summary = attendanceSummaryQuery.data;
  const serviceEvents = serviceEventsQuery.data ?? [];
  const hasDateFilter = Boolean(startDate || endDate);

  if (!summary) {
    return null;
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Attendance overview"
        title="Attendance"
        description="This overview keeps anonymous summary attendance and member-level attendance explicit as separate but related operational surfaces."
        meta={
          <StatusBadge
            label={hasDateFilter ? "Filtered range" : "All-time overview"}
            tone="info"
          />
        }
      />

      <form className="page-stack">
        <FormSection
          title="Date range"
          description="Use a reporting range for attendance summary cards and the event list below."
        >
          <div className="form-grid form-grid-3">
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
                  setStartDate("");
                  setEndDate("");
                }}
                type="button"
              >
                Reset range
              </button>
            </div>
          </div>
        </FormSection>
      </form>

      <section className="metrics-grid">
        <StatCard label="Events in range" value={summary.total_events} tone="accent" />
        <StatCard label="Aggregate attendance" value={summary.aggregate_total_attendance} />
        <StatCard label="Visitors" value={summary.aggregate_visitor_count} />
        <StatCard label="Member records" value={summary.total_member_attendance_records} />
      </section>

      <div className="panel-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Attendance breakdown</h3>
              <p className="muted-text">Anonymous summary totals across the selected date range.</p>
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

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Event type counts</h3>
              <p className="muted-text">Counts of events by current backend event-type classification.</p>
            </div>
          </div>
          {summary.event_type_counts.length === 0 ? (
            <EmptyState
              title="No event-type counts yet"
              description="Create events and record attendance to populate the reporting breakdown."
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
          title={hasDateFilter ? "No events in the selected range" : "No events available for attendance yet"}
          description={
            hasDateFilter
              ? "Try expanding the date range."
              : "Create a service event first, then use the attendance workflow to record summary and member attendance."
          }
          action={
            <Link className="button button-primary" to="/events">
              Go to events
            </Link>
          }
        />
      ) : (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Recent events</h3>
              <p className="muted-text">Open the event detail or direct attendance recording workflow from here.</p>
            </div>
          </div>
          <EntityTable
            columns={[
              {
                header: "Event",
                cell: (serviceEvent) => (
                  <div className="cell-stack">
                    <Link className="table-link" to={`/events/${serviceEvent.id}`}>
                      {serviceEvent.title}
                    </Link>
                    <span className="table-subtext">
                      {getServiceEventTypeLabel(serviceEvent.event_type)} · {formatDate(serviceEvent.service_date)}
                    </span>
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
                  <div className="inline-actions">
                    <Link className="button button-secondary button-compact" to={`/events/${serviceEvent.id}`}>
                      View
                    </Link>
                    <Link
                      className="button button-ghost button-compact"
                      to={`/events/${serviceEvent.id}/attendance`}
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
