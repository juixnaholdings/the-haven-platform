"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { queryClient } from "@/api/queryClient";
import { ErrorAlert, ErrorState, FormModalShell, FormSection, LoadingState, PageHeader, StatCard, StatusBadge } from "@/components";
import { attendanceApi } from "@/domains/attendance/api";
import { getServiceEventTypeLabel, SERVICE_EVENT_TYPE_OPTIONS } from "@/domains/attendance/options";
import type { ServiceEventWritePayload } from "@/domains/types";
import { formatDate, formatDateTime, formatTime } from "@/lib/formatters";

function getAttendanceProgressTone(status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED") {
  if (status === "COMPLETED") {
    return "success" as const;
  }
  if (status === "IN_PROGRESS") {
    return "warning" as const;
  }
  return "muted" as const;
}

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

export function EventDetailPageScreen() {
  const params = useParams<{ serviceEventId: string }>();
  const numericServiceEventId = Number(params.serviceEventId);
  const [formOverrides, setFormOverrides] = useState<Partial<EventFormState>>({});
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const serviceEventQuery = useQuery({
    enabled: Number.isFinite(numericServiceEventId),
    queryKey: ["service-event", numericServiceEventId],
    queryFn: () => attendanceApi.getServiceEvent(numericServiceEventId),
  });

  const baseFormState = useMemo<EventFormState>(() => {
    if (!serviceEventQuery.data) {
      return emptyEventForm;
    }

    return {
      title: serviceEventQuery.data.title,
      event_type: serviceEventQuery.data.event_type,
      service_date: serviceEventQuery.data.service_date,
      start_time: serviceEventQuery.data.start_time || "",
      end_time: serviceEventQuery.data.end_time || "",
      location: serviceEventQuery.data.location || "",
      notes: serviceEventQuery.data.notes || "",
      is_active: serviceEventQuery.data.is_active,
    };
  }, [serviceEventQuery.data]);

  const formState = useMemo<EventFormState>(
    () => ({
      ...baseFormState,
      ...formOverrides,
    }),
    [baseFormState, formOverrides],
  );

  const updateServiceEventMutation = useMutation({
    mutationFn: (payload: Partial<ServiceEventWritePayload>) =>
      attendanceApi.updateServiceEvent(numericServiceEventId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["service-events"] });
      await queryClient.invalidateQueries({ queryKey: ["service-event", numericServiceEventId] });
      await queryClient.invalidateQueries({ queryKey: ["attendance-overview"] });
      setFormOverrides({});
      setIsEditModalOpen(false);
    },
  });

  if (!Number.isFinite(numericServiceEventId)) {
    return (
      <ErrorState
        description="The requested event identifier is not valid."
        error={new Error("Invalid event identifier.")}
        title="Event route is invalid"
      />
    );
  }

  if (serviceEventQuery.isLoading) {
    return (
      <LoadingState
        description="Fetching the service event profile and attendance snapshot."
        title="Loading event"
      />
    );
  }

  if (serviceEventQuery.error || !serviceEventQuery.data) {
    return (
      <ErrorState
        error={serviceEventQuery.error ?? new Error("Event not found.")}
        onRetry={() => {
          void serviceEventQuery.refetch();
        }}
        title="Event could not be loaded"
      />
    );
  }

  const serviceEvent = serviceEventQuery.data;
  const summaryTotal = serviceEvent.attendance_summary?.total_count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link className="button button-secondary" href="/events">
              Back to events
            </Link>
            <button
              className="button button-ghost"
              onClick={() => setIsEditModalOpen(true)}
              type="button"
            >
              Edit event
            </button>
            <Link className="button button-primary" href={`/events/${serviceEvent.id}/attendance`}>
              Record attendance
            </Link>
          </div>
        }
        description="This detail page stays within the current backend scope: event profile, attendance snapshot, and links into full attendance recording."
        eyebrow="Services / events"
        meta={
          <>
            <StatusBadge
              label={serviceEvent.is_active ? "Active event" : "Inactive event"}
              tone={serviceEvent.is_active ? "success" : "muted"}
            />
            <StatusBadge label={getServiceEventTypeLabel(serviceEvent.event_type)} tone="info" />
          </>
        }
        title={serviceEvent.title}
      />

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Service date" tone="accent" value={formatDate(serviceEvent.service_date)} />
        <StatCard label="Member records" value={serviceEvent.member_attendance_count} />
        <StatCard label="Summary total" value={summaryTotal} />
        <StatCard label="Attendance progress" value={`${serviceEvent.attendance_progress_percent}%`} />
        <StatCard label="Attendance updated" value={formatDate(serviceEvent.attendance_last_updated_at)} />
      </section>

      <div className="grid gap-4 items-start grid-cols-1 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Event profile</h3>
              <p className="m-0 text-sm text-slate-500">Core service-event fields from the backend payload.</p>
            </div>
          </div>
          <dl className="grid gap-3.5 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <dt>Type</dt>
              <dd>{getServiceEventTypeLabel(serviceEvent.event_type)}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <dt>Service date</dt>
              <dd>{formatDate(serviceEvent.service_date)}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <dt>Start time</dt>
              <dd>{formatTime(serviceEvent.start_time)}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <dt>End time</dt>
              <dd>{formatTime(serviceEvent.end_time)}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <dt>Location</dt>
              <dd>{serviceEvent.location || "Not set"}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Attendance snapshot</h3>
              <p className="m-0 text-sm text-slate-500">Anonymous summary and member records remain distinct.</p>
            </div>
          </div>
          <dl className="grid gap-3.5 grid-cols-1">
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <dt>Summary status</dt>
              <dd>
                <StatusBadge
                  label={serviceEvent.attendance_progress_label}
                  tone={getAttendanceProgressTone(serviceEvent.attendance_progress_status)}
                />
              </dd>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <dt>Member attendance rows</dt>
              <dd>{serviceEvent.member_attendance_count}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <dt>Attendance last updated</dt>
              <dd>{formatDateTime(serviceEvent.attendance_last_updated_at)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Notes</h3>
            <p className="m-0 text-sm text-slate-500">Event-level notes only. Attendance notes are handled in the recording workflow.</p>
          </div>
        </div>
        <p className="m-0 whitespace-pre-wrap text-sm text-slate-600">{serviceEvent.notes || "No event notes recorded."}</p>
      </section>

      <FormModalShell
        description="Update the current service-event record through the existing patch endpoint."
        footer={
          <>
            <button
              className="button button-secondary"
              onClick={() => setIsEditModalOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              disabled={updateServiceEventMutation.isPending}
              form="update-event-modal-form"
              type="submit"
            >
              {updateServiceEventMutation.isPending ? "Saving..." : "Save event changes"}
            </button>
          </>
        }
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        size="large"
        title="Update event"
      >
        <form
          className="space-y-6"
          id="update-event-modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            updateServiceEventMutation.mutate(toEventPayload(formState));
          }}
        >
          <FormSection title="Event details">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field">
                <span>Title</span>
                <input
                  onChange={(event) =>
                    setFormOverrides((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  required
                  value={formState.title}
                />
              </label>

              <label className="field">
                <span>Event type</span>
                <select
                  onChange={(event) =>
                    setFormOverrides((current) => ({
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

              <label className="field">
                <span>Service date</span>
                <input
                  onChange={(event) =>
                    setFormOverrides((current) => ({
                      ...current,
                      service_date: event.target.value,
                    }))
                  }
                  required
                  type="date"
                  value={formState.service_date}
                />
              </label>

              <label className="field">
                <span>Location</span>
                <input
                  onChange={(event) =>
                    setFormOverrides((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  value={formState.location}
                />
              </label>

              <label className="field">
                <span>Start time</span>
                <input
                  onChange={(event) =>
                    setFormOverrides((current) => ({
                      ...current,
                      start_time: event.target.value,
                    }))
                  }
                  type="time"
                  value={formState.start_time}
                />
              </label>

              <label className="field">
                <span>End time</span>
                <input
                  onChange={(event) =>
                    setFormOverrides((current) => ({
                      ...current,
                      end_time: event.target.value,
                    }))
                  }
                  type="time"
                  value={formState.end_time}
                />
              </label>

              <label className="checkbox-field checkbox-field-inline">
                <input
                  checked={formState.is_active}
                  onChange={(event) =>
                    setFormOverrides((current) => ({
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
                onChange={(event) =>
                  setFormOverrides((current) => ({
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
            error={updateServiceEventMutation.error}
            fallbackMessage="The service event could not be updated."
          />
        </form>
      </FormModalShell>
    </div>
  );
}
