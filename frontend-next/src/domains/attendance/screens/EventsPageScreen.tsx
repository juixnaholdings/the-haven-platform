"use client";

import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  EmptyState,
  EntityTable,
  ErrorState,
  FilterActionStrip,
  LoadingState,
  PageHeader,
  PaginationControls,
  StatCard,
  StatusBadge,
} from "@/components";
import { attendanceApi } from "@/domains/attendance/api";
import { CreateServiceEventModal, RecordAttendanceModal } from "@/domains/attendance/components";
import { getServiceEventTypeLabel, SERVICE_EVENT_TYPE_OPTIONS } from "@/domains/attendance/options";
import { formatDate, formatTime } from "@/lib/formatters";

type EventStatusFilter = "all" | "active" | "inactive";

function getAttendanceProgressTone(status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED") {
  if (status === "COMPLETED") {
    return "success" as const;
  }
  if (status === "IN_PROGRESS") {
    return "warning" as const;
  }
  return "muted" as const;
}

export function EventsPageScreen() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isRecordAttendanceModalOpen, setIsRecordAttendanceModalOpen] = useState(false);
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

  const serviceEvents = serviceEventsQuery.data?.items ?? [];
  const pagination = serviceEventsQuery.data?.pagination ?? null;
  const totalServiceEvents = pagination?.count ?? serviceEvents.length;
  const hasFilters = Boolean(search.trim()) || eventTypeFilter !== "all" || statusFilter !== "all";
  const activeEvents = serviceEvents.filter((serviceEvent) => serviceEvent.is_active).length;
  const completedEvents = serviceEvents.filter((serviceEvent) => serviceEvent.attendance_is_complete).length;
  const inProgressEvents = serviceEvents.filter(
    (serviceEvent) => serviceEvent.attendance_progress_status === "IN_PROGRESS",
  ).length;
  const nextEvent = [...serviceEvents]
    .filter((serviceEvent) => Boolean(serviceEvent.service_date))
    .sort((left, right) => left.service_date.localeCompare(right.service_date))[0];

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
            <button
              className="button button-secondary"
              onClick={() => setIsCreateEventModalOpen(true)}
              type="button"
            >
              New event
            </button>
          </div>
        }
        title="Events"
      />

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Events" tone="accent" value={totalServiceEvents} />
        <StatCard label="Active in view" value={activeEvents} />
        <StatCard label="Attendance complete" value={completedEvents} />
        <StatCard label="Attendance in progress" value={inProgressEvents} />
        <StatCard label="Next in view" value={nextEvent ? formatDate(nextEvent.service_date) : "Not scheduled"} />
      </section>

      
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
                      {getServiceEventTypeLabel(serviceEvent.event_type)} | {formatDate(serviceEvent.service_date)}
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
                cell: (serviceEvent) => serviceEvent.location || "-",
              },
              {
                header: "Attendance",
                cell: (serviceEvent) => (
                  <div className="grid gap-1">
                    <StatusBadge
                      label={serviceEvent.attendance_progress_label}
                      tone={getAttendanceProgressTone(serviceEvent.attendance_progress_status)}
                    />
                    <span>{serviceEvent.member_attendance_count} member records</span>
                    <span className="block text-xs text-slate-500">
                      {serviceEvent.has_attendance_summary ? "Summary recorded" : "No summary yet"}
                    </span>
                    <span className="block text-xs text-slate-500">
                      Progress: {serviceEvent.attendance_progress_percent}%
                    </span>
                    <span className="block text-xs text-slate-500">
                      Last attendance update: {formatDate(serviceEvent.attendance_last_updated_at)}
                    </span>
                  </div>
                ),
              },
              // {
              //   header: "Status",
              //   cell: (serviceEvent) => (
              //     <StatusBadge
              //       label={serviceEvent.is_active ? "Active" : "Inactive"}
              //       tone={serviceEvent.is_active ? "success" : "muted"}
              //     />
              //   ),
              // },
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
                      {serviceEvent.attendance_is_complete ? "Review attendance" : "Continue attendance"}
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

      <CreateServiceEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
        onCreated={(serviceEvent) => {
          router.push(`/events/${serviceEvent.id}`);
        }}
      />
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

