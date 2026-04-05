"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { queryClient } from "@/api/queryClient";
import { ButtonLoadingContent, ErrorAlert, FormModalShell, FormSection } from "@/components";
import { attendanceApi } from "@/domains/attendance/api";
import { SERVICE_EVENT_TYPE_OPTIONS } from "@/domains/attendance/options";
import type { ServiceEventDetail, ServiceEventWritePayload } from "@/domains/types";

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

interface CreateServiceEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (serviceEvent: ServiceEventDetail) => void;
  title?: string;
  description?: string;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultFormState(): EventFormState {
  return {
    title: "",
    event_type: "OTHER",
    service_date: getTodayDate(),
    start_time: "",
    end_time: "",
    location: "",
    notes: "",
    is_active: true,
  };
}

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

export function CreateServiceEventModal({
  isOpen,
  onClose,
  onCreated,
  title = "Create event",
  description = "Capture event details in a modal-first workflow and move directly into event and attendance operations.",
}: CreateServiceEventModalProps) {
  const [formState, setFormState] = useState<EventFormState>(() => getDefaultFormState());
  const resetFormState = () => {
    setFormState(getDefaultFormState());
  };
  const handleClose = () => {
    resetFormState();
    onClose();
  };

  const createEventMutation = useMutation({
    mutationFn: (payload: ServiceEventWritePayload) => attendanceApi.createServiceEvent(payload),
    onSuccess: async (serviceEvent) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["service-events"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["attendance-overview-events"] }),
      ]);
      resetFormState();
      onCreated?.(serviceEvent);
      onClose();
    },
  });

  const isSubmitDisabled = useMemo(
    () => createEventMutation.isPending || !formState.title.trim() || !formState.service_date,
    [createEventMutation.isPending, formState.service_date, formState.title],
  );

  return (
    <FormModalShell
      description={description}
      footer={
        <>
          <button
            className="button button-secondary"
            onClick={handleClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="button button-primary"
            disabled={isSubmitDisabled}
            form="create-service-event-modal-form"
            type="submit"
          >
            <ButtonLoadingContent isLoading={createEventMutation.isPending} loadingText="Creating...">
              Create event
            </ButtonLoadingContent>
          </button>
        </>
      }
      isOpen={isOpen}
      onClose={handleClose}
      size="large"
      title={title}
    >
      <form
        className="space-y-6"
        id="create-service-event-modal-form"
        onSubmit={(event) => {
          event.preventDefault();
          createEventMutation.mutate(toEventPayload(formState));
        }}
      >
        <FormSection
          description="This writes directly to the existing service-event create endpoint."
          title="Event details"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field">
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

            <label className="field">
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

            <label className="field">
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

            <label className="field">
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

            <label className="field">
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

            <label className="field">
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
      </form>
    </FormModalShell>
  );
}
