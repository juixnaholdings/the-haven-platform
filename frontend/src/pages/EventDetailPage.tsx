import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { queryClient } from "../api/queryClient";
import { ErrorAlert } from "../components/ErrorAlert";
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
import { formatDate, formatDateTime, formatTime } from "../utils/formatters";

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

export function EventDetailPage() {
  const { serviceEventId } = useParams();
  const numericServiceEventId = Number(serviceEventId);
  const [formState, setFormState] = useState<EventFormState>(emptyEventForm);

  const serviceEventQuery = useQuery({
    enabled: Number.isFinite(numericServiceEventId),
    queryKey: ["service-event", numericServiceEventId],
    queryFn: () => attendanceApi.getServiceEvent(numericServiceEventId),
  });

  useEffect(() => {
    if (!serviceEventQuery.data) {
      return;
    }

    setFormState({
      title: serviceEventQuery.data.title,
      event_type: serviceEventQuery.data.event_type,
      service_date: serviceEventQuery.data.service_date,
      start_time: serviceEventQuery.data.start_time || "",
      end_time: serviceEventQuery.data.end_time || "",
      location: serviceEventQuery.data.location || "",
      notes: serviceEventQuery.data.notes || "",
      is_active: serviceEventQuery.data.is_active,
    });
  }, [serviceEventQuery.data]);

  const updateServiceEventMutation = useMutation({
    mutationFn: (payload: Partial<ServiceEventWritePayload>) =>
      attendanceApi.updateServiceEvent(numericServiceEventId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["service-events"] });
      await queryClient.invalidateQueries({ queryKey: ["service-event", numericServiceEventId] });
      await queryClient.invalidateQueries({ queryKey: ["attendance-overview"] });
    },
  });

  if (!Number.isFinite(numericServiceEventId)) {
    return (
      <ErrorState
        title="Event route is invalid"
        description="The requested event identifier is not valid."
        error={new Error("Invalid event identifier.")}
      />
    );
  }

  if (serviceEventQuery.isLoading) {
    return (
      <LoadingState
        title="Loading event"
        description="Fetching the service event profile and attendance snapshot."
      />
    );
  }

  if (serviceEventQuery.error || !serviceEventQuery.data) {
    return (
      <ErrorState
        title="Event could not be loaded"
        error={serviceEventQuery.error ?? new Error("Event not found.")}
        onRetry={() => {
          void serviceEventQuery.refetch();
        }}
      />
    );
  }

  const serviceEvent = serviceEventQuery.data;
  const summaryTotal = serviceEvent.attendance_summary?.total_count ?? 0;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Services / events"
        title={serviceEvent.title}
        description="This detail page stays within the current backend scope: event profile, attendance snapshot, and links into full attendance recording."
        actions={
          <div className="inline-actions">
            <Link className="button button-secondary" to="/events">
              Back to events
            </Link>
            <Link className="button button-primary" to={`/events/${serviceEvent.id}/attendance`}>
              Record attendance
            </Link>
          </div>
        }
        meta={
          <>
            <StatusBadge
              label={serviceEvent.is_active ? "Active event" : "Inactive event"}
              tone={serviceEvent.is_active ? "success" : "muted"}
            />
            <StatusBadge label={getServiceEventTypeLabel(serviceEvent.event_type)} tone="info" />
          </>
        }
      />

      <section className="metrics-grid">
        <StatCard label="Service date" value={formatDate(serviceEvent.service_date)} tone="accent" />
        <StatCard label="Member records" value={serviceEvent.member_attendances.length} />
        <StatCard label="Summary total" value={summaryTotal} />
      </section>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Event profile</h3>
              <p className="muted-text">Core service-event fields from the backend payload.</p>
            </div>
          </div>
          <dl className="detail-grid detail-grid-2">
            <div className="detail-item">
              <dt>Type</dt>
              <dd>{getServiceEventTypeLabel(serviceEvent.event_type)}</dd>
            </div>
            <div className="detail-item">
              <dt>Service date</dt>
              <dd>{formatDate(serviceEvent.service_date)}</dd>
            </div>
            <div className="detail-item">
              <dt>Start time</dt>
              <dd>{formatTime(serviceEvent.start_time)}</dd>
            </div>
            <div className="detail-item">
              <dt>End time</dt>
              <dd>{formatTime(serviceEvent.end_time)}</dd>
            </div>
            <div className="detail-item">
              <dt>Location</dt>
              <dd>{serviceEvent.location || "Not set"}</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Attendance snapshot</h3>
              <p className="muted-text">Anonymous summary and member records remain distinct.</p>
            </div>
          </div>
          <dl className="detail-grid detail-grid-1">
            <div className="detail-item">
              <dt>Summary status</dt>
              <dd>
                <StatusBadge
                  label={serviceEvent.attendance_summary ? "Summary recorded" : "No summary yet"}
                  tone={serviceEvent.attendance_summary ? "success" : "warning"}
                />
              </dd>
            </div>
            <div className="detail-item">
              <dt>Member attendance rows</dt>
              <dd>{serviceEvent.member_attendances.length}</dd>
            </div>
            <div className="detail-item">
              <dt>Last updated</dt>
              <dd>{formatDateTime(serviceEvent.updated_at)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Notes</h3>
            <p className="muted-text">Event-level notes only. Attendance notes are handled in the recording workflow.</p>
          </div>
        </div>
        <p className="panel-copy">{serviceEvent.notes || "No event notes recorded."}</p>
      </section>

      <form
        className="page-stack"
        onSubmit={(event) => {
          event.preventDefault();
          updateServiceEventMutation.mutate(toEventPayload(formState));
        }}
      >
        <FormSection
          title="Update event"
          description="Update the current service-event record through the existing patch endpoint."
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
          error={updateServiceEventMutation.error}
          fallbackMessage="The service event could not be updated."
        />

        <div className="inline-actions">
          <button
            className="button button-primary"
            disabled={updateServiceEventMutation.isPending}
            type="submit"
          >
            {updateServiceEventMutation.isPending ? "Saving..." : "Save event changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
