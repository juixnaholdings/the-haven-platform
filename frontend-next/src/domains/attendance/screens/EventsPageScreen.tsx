"use client";

import { useDeferredValue, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { queryClient } from "@/api/queryClient";
import {
  EmptyState,
  EntityTable,
  ErrorAlert,
  ErrorState,
  FilterActionStrip,
  FormSection,
  LoadingState,
  PageHeader,
  PaginationControls,
  StatCard,
  StatusBadge,
} from "@/components";
import { attendanceApi } from "@/domains/attendance/api";
import { getServiceEventTypeLabel, SERVICE_EVENT_TYPE_OPTIONS } from "@/domains/attendance/options";
import type { ServiceEventWritePayload } from "@/domains/types";
import { formatDate, formatTime } from "@/lib/formatters";

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

export function EventsPageScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formState, setFormState] = useState<EventFormState>(emptyEventForm);
  const deferredSearch = useDeferredValue(search);

  const serviceEventsQuery = useQuery({
    queryKey: ["service-events", { search: deferredSearch, eventTypeFilter, statusFilter, page, pageSize }],
    queryFn: () =>
      attendanceApi.listServiceEventsPage({
        search: deferredSearch || undefined,
        event_type: eventTypeFilter === "all" ? undefined : eventTypeFilter,
        is_active: statusFilter === "all" ? undefined : statusFilter === "active",
        page,
        page_size: pageSize,
      }),
  });

  const createEventMutation = useMutation({
    mutationFn: (payload: ServiceEventWritePayload) => attendanceApi.createServiceEvent(payload),
    onSuccess: async (serviceEvent) => {
      await queryClient.invalidateQueries({ queryKey: ["service-events"] });
      setFormState(emptyEventForm);
      setShowCreateForm(false);
      router.push(`/events/${serviceEvent.id}`);
    },
  });

  const serviceEvents = serviceEventsQuery.data?.items ?? [];
  const pagination = serviceEventsQuery.data?.pagination ?? null;
  const totalServiceEvents = pagination?.count ?? serviceEvents.length;
  const hasFilters = Boolean(search.trim()) || eventTypeFilter !== "all" || statusFilter !== "all";
  const activeEvents = serviceEvents.filter((serviceEvent) => serviceEvent.is_active).length;
  const eventsWithSummary = serviceEvents.filter((serviceEvent) => serviceEvent.has_attendance_summary).length;
  const nextEvent = [...serviceEvents]
    .filter((serviceEvent) => Boolean(serviceEvent.service_date))
    .sort((left, right) => left.service_date.localeCompare(right.service_date))[0];

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <button
            className={showCreateForm ? "button button-secondary" : "button button-primary"}
            onClick={() => setShowCreateForm((current) => !current)}
            type="button"
          >
            {showCreateForm ? "Close form" : "New event"}
          </button>
        }
        description="Manage church services and events, then move into the detail and attendance recording workflows."
        eyebrow="Services / events"
        meta={
          <StatusBadge
            label={`${totalServiceEvents} event${totalServiceEvents === 1 ? "" : "s"}`}
            tone="info"
          />
        }
        title="Events"
      />

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Events" tone="accent" value={totalServiceEvents} />
        <StatCard label="Active in view" value={activeEvents} />
        <StatCard label="Summary in view" value={eventsWithSummary} />
        <StatCard label="Next in view" value={nextEvent ? formatDate(nextEvent.service_date) : "Not scheduled"} />
      </section>

      <FilterActionStrip
        actions={
          hasFilters ? (
            <button
              className="button button-secondary"
              onClick={() => {
                setSearch("");
                setEventTypeFilter("all");
                setStatusFilter("all");
                setPage(1);
              }}
              type="button"
            >
              Clear filters
            </button>
          ) : null
        }
        filters={
          <>
            <label className="grid gap-2">
              <span>Event type</span>
              <select
                onChange={(event) => {
                  setEventTypeFilter(event.target.value);
                  setPage(1);
                }}
                value={eventTypeFilter}
              >
                <option value="all">All event types</option>
                {SERVICE_EVENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2">
              <span>Status</span>
              <select
                onChange={(event) => {
                  setStatusFilter(event.target.value as EventStatusFilter);
                  setPage(1);
                }}
                value={statusFilter}
              >
                <option value="all">All events</option>
                <option value="active">Active events</option>
                <option value="inactive">Inactive events</option>
              </select>
            </label>
          </>
        }
        search={
          <label className="grid gap-2">
            <span>Search events</span>
            <input
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by title or location"
              value={search}
            />
          </label>
        }
      />

      {showCreateForm ? (
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            createEventMutation.mutate(toEventPayload(formState));
          }}
        >
          <FormSection
            description="This form uses the real service-event create endpoint and opens the saved detail workflow."
            title="Create event"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2">
                <span>Title</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  required
                  value={formState.title}
                />
              </label>

              <label className="grid gap-2">
                <span>Event type</span>
                <select
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      event_type: event.target.value,
                    }))
                  }
                  value={formState.event_type}
                >
                  {SERVICE_EVENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2">
                <span>Service date</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      service_date: event.target.value,
                    }))
                  }
                  required
                  type="date"
                  value={formState.service_date}
                />
              </label>

              <label className="grid gap-2">
                <span>Location</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  value={formState.location}
                />
              </label>

              <label className="grid gap-2">
                <span>Start time</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      start_time: event.target.value,
                    }))
                  }
                  type="time"
                  value={formState.start_time}
                />
              </label>

              <label className="grid gap-2">
                <span>End time</span>
                <input
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      end_time: event.target.value,
                    }))
                  }
                  type="time"
                  value={formState.end_time}
                />
              </label>

              <label className="flex items-start gap-2.5 font-medium text-slate-700 pt-8">
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

            <label className="grid gap-2">
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

          <ErrorAlert
            error={createEventMutation.error}
            fallbackMessage="The service event could not be created."
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <button className="button button-primary" disabled={createEventMutation.isPending} type="submit">
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
          description="Fetching service events and attendance flags from the backend."
          title="Loading events"
        />
      ) : null}

      {serviceEventsQuery.error ? (
        <ErrorState
          error={serviceEventsQuery.error}
          onRetry={() => {
            void serviceEventsQuery.refetch();
          }}
          title="Events could not be loaded"
        />
      ) : null}

      {!serviceEventsQuery.isLoading && !serviceEventsQuery.error && serviceEvents.length === 0 ? (
        <EmptyState
          action={
            hasFilters ? (
              <button
                className="button button-secondary"
                onClick={() => {
                  setSearch("");
                  setEventTypeFilter("all");
                  setStatusFilter("all");
                  setPage(1);
                }}
                type="button"
              >
                Clear filters
              </button>
            ) : (
              <button className="button button-primary" onClick={() => setShowCreateForm(true)} type="button">
                Create event
              </button>
            )
          }
          description={
            hasFilters
              ? "Try a broader search or adjust the event-type and status filters."
              : "Create the first event to start tracking attendance and service operations."
          }
          title={hasFilters ? "No events matched the current filters" : "No events have been created yet"}
        />
      ) : null}

      {!serviceEventsQuery.isLoading && !serviceEventsQuery.error && serviceEvents.length > 0 ? (
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
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
                  <div className="grid gap-1">
                    <span>{serviceEvent.member_attendance_count} member records</span>
                    <span className="block text-xs text-slate-500">
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
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link className="button button-secondary button-compact" href={`/events/${serviceEvent.id}`}>
                      View
                    </Link>
                    <Link
                      className="button button-ghost button-compact"
                      href={`/events/${serviceEvent.id}/attendance`}
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
          <PaginationControls
            onPageChange={(nextPage) => setPage(nextPage)}
            onPageSizeChange={(nextPageSize) => {
              setPageSize(nextPageSize);
              setPage(1);
            }}
            pagination={pagination}
          />
        </section>
      ) : null}
    </div>
  );
}
