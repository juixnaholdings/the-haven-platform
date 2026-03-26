import { useDeferredValue, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

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
import {
  getServiceEventTypeLabel,
  SERVICE_EVENT_TYPE_OPTIONS,
} from "../domains/attendance/options";
import type { ServiceEventWritePayload } from "../domains/types";
import { formatDate, formatTime } from "../utils/formatters";

type EventStatusFilter = "all" | "active" | "inactive";

interface EventFormState {
  title: string;
  event_type: string;
  service_date: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
  is_active: boolean;
}

const emptyEventForm: EventFormState = {
  title: "",
  event_type: "OTHER",
  service_date: "",
  start_time: "",
  end_time: "",
  location: "",
  notes: "",
  is_active: true,
};

function toEventPayload(formState: EventFormState): ServiceEventWritePayload {
  return {
    title: formState.title,
    event_type: formState.event_type,
    service_date: formState.service_date,
    start_time: formState.start_time || null,
    end_time: formState.end_time || null,
    location: formState.location || undefined,
    notes: formState.notes || undefined,
    is_active: formState.is_active,
  };
}

export function EventsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formState, setFormState] = useState<EventFormState>(emptyEventForm);
  const deferredSearch = useDeferredValue(search);

  const serviceEventsQuery = useQuery({
    queryKey: ["service-events", { search: deferredSearch, eventTypeFilter, statusFilter }],
    queryFn: () =>
      attendanceApi.listServiceEvents({
        search: deferredSearch || undefined,
        event_type: eventTypeFilter === "all" ? undefined : eventTypeFilter,
        is_active: statusFilter === "all" ? undefined : statusFilter === "active",
      }),
  });

  const createEventMutation = useMutation({
    mutationFn: (payload: ServiceEventWritePayload) => attendanceApi.createServiceEvent(payload),
    onSuccess: async (serviceEvent) => {
      await queryClient.invalidateQueries({ queryKey: ["service-events"] });
      setFormState(emptyEventForm);
      setShowCreateForm(false);
      navigate(`/events/${serviceEvent.id}`);
    },
  });

  const serviceEvents = serviceEventsQuery.data ?? [];
  const hasFilters =
    Boolean(search.trim()) || eventTypeFilter !== "all" || statusFilter !== "all";
  const activeEvents = serviceEvents.filter((serviceEvent) => serviceEvent.is_active).length;
  const eventsWithSummary = serviceEvents.filter(
    (serviceEvent) => serviceEvent.has_attendance_summary,
  ).length;
  const nextEvent = [...serviceEvents]
    .filter((serviceEvent) => Boolean(serviceEvent.service_date))
    .sort((left, right) => left.service_date.localeCompare(right.service_date))[0];

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Services / events"
        title="Events"
        description="Manage church services and events, then move into the detail and attendance recording workflows."
        actions={
          <button
            className={showCreateForm ? "button button-secondary" : "button button-primary"}
            onClick={() => setShowCreateForm((current) => !current)}
            type="button"
          >
            {showCreateForm ? "Close form" : "New event"}
          </button>
        }
        meta={
          <StatusBadge
            label={`${serviceEvents.length} event${serviceEvents.length === 1 ? "" : "s"}`}
            tone="info"
          />
        }
      />

      <section className="metrics-grid">
        <StatCard label="Events" value={serviceEvents.length} tone="accent" />
        <StatCard label="Active events" value={activeEvents} />
        <StatCard label="Summary recorded" value={eventsWithSummary} />
        <StatCard
          label="Next service date"
          value={nextEvent ? formatDate(nextEvent.service_date) : "Not scheduled"}
        />
      </section>

      <section className="panel">
        <div className="filters-grid filters-grid-3">
          <label className="field">
            <span>Search events</span>
            <input
              placeholder="Search by title or location"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Event type</span>
            <select
              value={eventTypeFilter}
              onChange={(event) => setEventTypeFilter(event.target.value)}
            >
              <option value="all">All event types</option>
              {SERVICE_EVENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as EventStatusFilter)}
            >
              <option value="all">All events</option>
              <option value="active">Active events</option>
              <option value="inactive">Inactive events</option>
            </select>
          </label>
        </div>
      </section>

      {showCreateForm ? (
        <form
          className="page-stack"
          onSubmit={(event) => {
            event.preventDefault();
            createEventMutation.mutate(toEventPayload(formState));
          }}
        >
          <FormSection
            title="Create event"
            description="This form uses the real service-event create endpoint and opens the saved detail workflow."
          >
            <div className="form-grid form-grid-2">
              <label className="field">
                <span>Title</span>
                <input
                  required
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Event type</span>
                <select
                  value={formState.event_type}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      event_type: event.target.value,
                    }))
                  }
                >
                  {SERVICE_EVENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Service date</span>
                <input
                  required
                  type="date"
                  value={formState.service_date}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      service_date: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Location</span>
                <input
                  value={formState.location}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Start time</span>
                <input
                  type="time"
                  value={formState.start_time}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      start_time: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>End time</span>
                <input
                  type="time"
                  value={formState.end_time}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      end_time: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="checkbox-field checkbox-field-inline">
                <input
                  checked={formState.is_active}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>Event is active</span>
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

          <ErrorAlert
            error={createEventMutation.error}
            fallbackMessage="The service event could not be created."
          />

          <div className="inline-actions">
            <button
              className="button button-primary"
              disabled={createEventMutation.isPending}
              type="submit"
            >
              {createEventMutation.isPending ? "Creating..." : "Create event"}
            </button>
            <button
              className="button button-secondary"
              onClick={() => {
                setFormState(emptyEventForm);
                setShowCreateForm(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {serviceEventsQuery.isLoading ? (
        <LoadingState
          title="Loading events"
          description="Fetching service events and attendance flags from the backend."
        />
      ) : null}

      {serviceEventsQuery.error ? (
        <ErrorState
          title="Events could not be loaded"
          error={serviceEventsQuery.error}
          onRetry={() => {
            void serviceEventsQuery.refetch();
          }}
        />
      ) : null}

      {!serviceEventsQuery.isLoading && !serviceEventsQuery.error && serviceEvents.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No events matched the current filters" : "No events have been created yet"}
          description={
            hasFilters
              ? "Try a broader search or adjust the event-type and status filters."
              : "Create the first event to start tracking attendance and service operations."
          }
          action={
            hasFilters ? (
              <button
                className="button button-secondary"
                onClick={() => {
                  setSearch("");
                  setEventTypeFilter("all");
                  setStatusFilter("all");
                }}
                type="button"
              >
                Clear filters
              </button>
            ) : (
              <button
                className="button button-primary"
                onClick={() => setShowCreateForm(true)}
                type="button"
              >
                Create event
              </button>
            )
          }
        />
      ) : null}

      {!serviceEventsQuery.isLoading && !serviceEventsQuery.error && serviceEvents.length > 0 ? (
        <section className="panel">
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
                header: "Schedule",
                cell: (serviceEvent) =>
                  serviceEvent.start_time || serviceEvent.end_time
                    ? `${formatTime(serviceEvent.start_time)} - ${formatTime(serviceEvent.end_time)}`
                    : "No time set",
              },
              {
                header: "Location",
                cell: (serviceEvent) => serviceEvent.location || "—",
              },
              {
                header: "Attendance",
                cell: (serviceEvent) => (
                  <div className="cell-stack">
                    <span>{serviceEvent.member_attendance_count} member records</span>
                    <span className="table-subtext">
                      {serviceEvent.has_attendance_summary ? "Summary recorded" : "No summary yet"}
                    </span>
                  </div>
                ),
              },
              {
                header: "Status",
                cell: (serviceEvent) => (
                  <StatusBadge
                    label={serviceEvent.is_active ? "Active" : "Inactive"}
                    tone={serviceEvent.is_active ? "success" : "muted"}
                  />
                ),
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
                      Attendance
                    </Link>
                  </div>
                ),
              },
            ]}
            getRowKey={(serviceEvent) => serviceEvent.id}
            rows={serviceEvents}
          />
        </section>
      ) : null}
    </div>
  );
}
