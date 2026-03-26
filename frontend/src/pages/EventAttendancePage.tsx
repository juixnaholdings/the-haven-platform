import { useDeferredValue, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

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
  ATTENDANCE_STATUS_OPTIONS,
  getAttendanceStatusLabel,
  getServiceEventTypeLabel,
} from "../domains/attendance/options";
import { membersApi } from "../domains/members/api";
import type {
  AttendanceSummaryWritePayload,
  MemberAttendanceCreatePayload,
  MemberAttendanceUpdatePayload,
} from "../domains/types";
import {
  formatDate,
  formatDateTime,
  toDateTimeLocalInputValue,
  toIsoDateTime,
} from "../utils/formatters";
import { formatMemberName } from "../utils/members";

interface SummaryFormState {
  men_count: string;
  women_count: string;
  children_count: string;
  visitor_count: string;
  notes: string;
}

interface MemberAttendanceFormState {
  member_id: string;
  status: string;
  checked_in_at: string;
  notes: string;
}

interface MemberAttendanceEditFormState {
  status: string;
  checked_in_at: string;
  notes: string;
}

const emptySummaryForm: SummaryFormState = {
  men_count: "0",
  women_count: "0",
  children_count: "0",
  visitor_count: "0",
  notes: "",
};

const emptyMemberAttendanceForm: MemberAttendanceFormState = {
  member_id: "",
  status: "PRESENT",
  checked_in_at: "",
  notes: "",
};

const emptyMemberAttendanceEditForm: MemberAttendanceEditFormState = {
  status: "PRESENT",
  checked_in_at: "",
  notes: "",
};

function toSafeCount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function toSummaryPayload(formState: SummaryFormState): AttendanceSummaryWritePayload {
  const menCount = toSafeCount(formState.men_count);
  const womenCount = toSafeCount(formState.women_count);
  const childrenCount = toSafeCount(formState.children_count);
  const visitorCount = toSafeCount(formState.visitor_count);
  return {
    men_count: menCount,
    women_count: womenCount,
    children_count: childrenCount,
    visitor_count: visitorCount,
    total_count: menCount + womenCount + childrenCount,
    notes: formState.notes || undefined,
  };
}

function toMemberAttendancePayload(
  formState: MemberAttendanceFormState,
): MemberAttendanceCreatePayload {
  return {
    member_id: Number(formState.member_id),
    status: formState.status,
    checked_in_at: toIsoDateTime(formState.checked_in_at),
    notes: formState.notes || undefined,
  };
}

function toMemberAttendanceUpdatePayload(
  formState: MemberAttendanceEditFormState,
): MemberAttendanceUpdatePayload {
  return {
    status: formState.status,
    checked_in_at: toIsoDateTime(formState.checked_in_at),
    notes: formState.notes || undefined,
  };
}

export function EventAttendancePage() {
  const { serviceEventId } = useParams();
  const numericServiceEventId = Number(serviceEventId);
  const [memberSearch, setMemberSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [summaryFormState, setSummaryFormState] = useState<SummaryFormState>(emptySummaryForm);
  const [addFormState, setAddFormState] =
    useState<MemberAttendanceFormState>(emptyMemberAttendanceForm);
  const [selectedMemberAttendanceId, setSelectedMemberAttendanceId] = useState<number | null>(null);
  const [editFormState, setEditFormState] =
    useState<MemberAttendanceEditFormState>(emptyMemberAttendanceEditForm);
  const deferredMemberSearch = useDeferredValue(memberSearch);
  const deferredCandidateSearch = useDeferredValue(candidateSearch);

  const serviceEventQuery = useQuery({
    enabled: Number.isFinite(numericServiceEventId),
    queryKey: ["service-event", numericServiceEventId],
    queryFn: () => attendanceApi.getServiceEvent(numericServiceEventId),
  });

  const memberAttendanceQuery = useQuery({
    enabled: Number.isFinite(numericServiceEventId),
    queryKey: ["member-attendance", numericServiceEventId, { search: deferredMemberSearch, statusFilter }],
    queryFn: () =>
      attendanceApi.listMemberAttendance(numericServiceEventId, {
        search: deferredMemberSearch || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
  });

  const candidateMembersQuery = useQuery({
    enabled: Number.isFinite(numericServiceEventId),
    queryKey: ["members", "event-attendance-candidates", numericServiceEventId, deferredCandidateSearch],
    queryFn: () =>
      membersApi.listMembers({
        search: deferredCandidateSearch || undefined,
        is_active: true,
      }),
  });

  useEffect(() => {
    const summary = serviceEventQuery.data?.attendance_summary;
    if (!summary) {
      setSummaryFormState(emptySummaryForm);
      return;
    }

    setSummaryFormState({
      men_count: String(summary.men_count),
      women_count: String(summary.women_count),
      children_count: String(summary.children_count),
      visitor_count: String(summary.visitor_count),
      notes: summary.notes || "",
    });
  }, [serviceEventQuery.data?.attendance_summary]);

  const existingMemberIds = new Set(
    (serviceEventQuery.data?.member_attendances ?? []).map((memberAttendance) => memberAttendance.member_id),
  );

  const candidateMembers = (candidateMembersQuery.data ?? []).filter(
    (member) => !existingMemberIds.has(member.id),
  );

  const selectedMemberAttendance =
    serviceEventQuery.data?.member_attendances.find(
      (memberAttendance) => memberAttendance.id === selectedMemberAttendanceId,
    ) ?? null;

  useEffect(() => {
    if (!selectedMemberAttendance) {
      setEditFormState(emptyMemberAttendanceEditForm);
      return;
    }

    setEditFormState({
      status: selectedMemberAttendance.status,
      checked_in_at: toDateTimeLocalInputValue(selectedMemberAttendance.checked_in_at),
      notes: selectedMemberAttendance.notes || "",
    });
  }, [selectedMemberAttendance]);

  const saveSummaryMutation = useMutation({
    mutationFn: (payload: AttendanceSummaryWritePayload) =>
      attendanceApi.upsertAttendanceSummary(numericServiceEventId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["service-event", numericServiceEventId] });
      await queryClient.invalidateQueries({ queryKey: ["service-events"] });
      await queryClient.invalidateQueries({ queryKey: ["attendance-overview"] });
    },
  });

  const createMemberAttendanceMutation = useMutation({
    mutationFn: (payload: MemberAttendanceCreatePayload) =>
      attendanceApi.createMemberAttendance(numericServiceEventId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["service-event", numericServiceEventId] });
      await queryClient.invalidateQueries({ queryKey: ["member-attendance", numericServiceEventId] });
      await queryClient.invalidateQueries({ queryKey: ["service-events"] });
      await queryClient.invalidateQueries({ queryKey: ["attendance-overview"] });
      setAddFormState(emptyMemberAttendanceForm);
      setCandidateSearch("");
    },
  });

  const updateMemberAttendanceMutation = useMutation({
    mutationFn: (payload: MemberAttendanceUpdatePayload) => {
      if (!selectedMemberAttendanceId) {
        throw new Error("No member attendance record selected.");
      }

      return attendanceApi.updateMemberAttendance(
        numericServiceEventId,
        selectedMemberAttendanceId,
        payload,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["service-event", numericServiceEventId] });
      await queryClient.invalidateQueries({ queryKey: ["member-attendance", numericServiceEventId] });
      await queryClient.invalidateQueries({ queryKey: ["attendance-overview"] });
    },
  });

  if (!Number.isFinite(numericServiceEventId)) {
    return (
      <ErrorState
        title="Attendance route is invalid"
        description="The requested event identifier is not valid."
        error={new Error("Invalid attendance route.")}
      />
    );
  }

  if (serviceEventQuery.isLoading || memberAttendanceQuery.isLoading) {
    return (
      <LoadingState
        title="Loading attendance workflow"
        description="Fetching the event profile, summary attendance, and member attendance records."
      />
    );
  }

  if (serviceEventQuery.error || memberAttendanceQuery.error || !serviceEventQuery.data) {
    return (
      <ErrorState
        title="Attendance workflow could not be loaded"
        error={serviceEventQuery.error ?? memberAttendanceQuery.error ?? new Error("Event not found.")}
        onRetry={() => {
          void serviceEventQuery.refetch();
          void memberAttendanceQuery.refetch();
        }}
      />
    );
  }

  const serviceEvent = serviceEventQuery.data;
  const memberAttendanceRecords = memberAttendanceQuery.data ?? [];
  const summaryPayload = toSummaryPayload(summaryFormState);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Attendance recording"
        title={serviceEvent.title}
        description="Summary attendance and member-level attendance are intentionally separate. The backend does not force them to reconcile, so this screen keeps both flows explicit."
        actions={
          <div className="inline-actions">
            <Link className="button button-secondary" to={`/events/${serviceEvent.id}`}>
              Back to event
            </Link>
            <Link className="button button-ghost" to="/attendance">
              Attendance overview
            </Link>
          </div>
        }
        meta={
          <>
            <StatusBadge label={getServiceEventTypeLabel(serviceEvent.event_type)} tone="info" />
            <StatusBadge
              label={serviceEvent.is_active ? "Active event" : "Inactive event"}
              tone={serviceEvent.is_active ? "success" : "muted"}
            />
          </>
        }
      />

      <section className="metrics-grid">
        <StatCard label="Service date" value={formatDate(serviceEvent.service_date)} tone="accent" />
        <StatCard label="Summary total" value={summaryPayload.total_count} />
        <StatCard label="Visitors" value={summaryPayload.visitor_count} />
        <StatCard label="Member records" value={serviceEvent.member_attendances.length} />
      </section>

      <div className="panel-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Event context</h3>
              <p className="muted-text">Operational event context for the current attendance session.</p>
            </div>
          </div>
          <dl className="definition-list">
            <div>
              <dt>Type</dt>
              <dd>{getServiceEventTypeLabel(serviceEvent.event_type)}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>{serviceEvent.location || "Not set"}</dd>
            </div>
            <div>
              <dt>Last updated</dt>
              <dd>{formatDateTime(serviceEvent.updated_at)}</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Current distinction</h3>
              <p className="muted-text">This is the important backend caveat for attendance screens.</p>
            </div>
          </div>
          <ul className="item-list">
            <li className="item-row">
              <div>
                <strong>Anonymous summary attendance</strong>
                <span>Aggregate men, women, children, and visitors.</span>
              </div>
            </li>
            <li className="item-row">
              <div>
                <strong>Member attendance records</strong>
                <span>Per-member status, check-in time, and notes.</span>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <form
        className="page-stack"
        onSubmit={(event) => {
          event.preventDefault();
          saveSummaryMutation.mutate(summaryPayload);
        }}
      >
        <FormSection
          title="Summary attendance"
          description="Total attendance is derived from men + women + children because that is the backend validation rule."
        >
          <div className="form-grid form-grid-3">
            <label className="field">
              <span>Men</span>
              <input
                min="0"
                type="number"
                value={summaryFormState.men_count}
                onChange={(event) =>
                  setSummaryFormState((current) => ({
                    ...current,
                    men_count: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Women</span>
              <input
                min="0"
                type="number"
                value={summaryFormState.women_count}
                onChange={(event) =>
                  setSummaryFormState((current) => ({
                    ...current,
                    women_count: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Children</span>
              <input
                min="0"
                type="number"
                value={summaryFormState.children_count}
                onChange={(event) =>
                  setSummaryFormState((current) => ({
                    ...current,
                    children_count: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Visitors</span>
              <input
                min="0"
                type="number"
                value={summaryFormState.visitor_count}
                onChange={(event) =>
                  setSummaryFormState((current) => ({
                    ...current,
                    visitor_count: event.target.value,
                  }))
                }
              />
            </label>

            <div className="detail-item">
              <dt>Derived total attendance</dt>
              <dd>{summaryPayload.total_count}</dd>
            </div>
          </div>

          <label className="field">
            <span>Summary notes</span>
            <textarea
              rows={4}
              value={summaryFormState.notes}
              onChange={(event) =>
                setSummaryFormState((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>
        </FormSection>

        <ErrorAlert
          error={saveSummaryMutation.error}
          fallbackMessage="The attendance summary could not be saved."
        />

        <div className="inline-actions">
          <button
            className="button button-primary"
            disabled={saveSummaryMutation.isPending}
            type="submit"
          >
            {saveSummaryMutation.isPending ? "Saving..." : "Save summary attendance"}
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Member attendance records</h3>
            <p className="muted-text">Filter and manage per-member attendance records for this event.</p>
          </div>
        </div>

        <div className="filters-grid filters-grid-2">
          <label className="field">
            <span>Search records</span>
            <input
              placeholder="Search by member name or email"
              value={memberSearch}
              onChange={(event) => setMemberSearch(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {memberAttendanceRecords.length === 0 ? (
          <EmptyState
            title="No member attendance records matched"
            description="Add a member attendance record below or broaden the current filters."
          />
        ) : (
          <EntityTable
            columns={[
              {
                header: "Member",
                cell: (memberAttendance) => (
                  <div className="cell-stack">
                    <Link className="table-link" to={`/members/${memberAttendance.member_id}`}>
                      {formatMemberName(memberAttendance)}
                    </Link>
                    <span className="table-subtext">{memberAttendance.email || "Profile-only record"}</span>
                  </div>
                ),
              },
              {
                header: "Status",
                cell: (memberAttendance) => (
                  <StatusBadge
                    label={getAttendanceStatusLabel(memberAttendance.status)}
                    tone={memberAttendance.status === "PRESENT" ? "success" : "warning"}
                  />
                ),
              },
              {
                header: "Checked in",
                cell: (memberAttendance) => formatDateTime(memberAttendance.checked_in_at),
              },
              {
                header: "Actions",
                className: "cell-actions",
                cell: (memberAttendance) => (
                  <div className="inline-actions">
                    <button
                      className={
                        selectedMemberAttendanceId === memberAttendance.id
                          ? "button button-secondary button-compact"
                          : "button button-ghost button-compact"
                      }
                      onClick={() => setSelectedMemberAttendanceId(memberAttendance.id)}
                      type="button"
                    >
                      {selectedMemberAttendanceId === memberAttendance.id ? "Editing" : "Edit record"}
                    </button>
                  </div>
                ),
              },
            ]}
            getRowKey={(memberAttendance) => memberAttendance.id}
            rows={memberAttendanceRecords}
          />
        )}
      </section>

      <form
        className="page-stack"
        onSubmit={(event) => {
          event.preventDefault();
          createMemberAttendanceMutation.mutate(toMemberAttendancePayload(addFormState));
        }}
      >
        <FormSection
          title="Add member attendance"
          description="Use the active member directory for member-level attendance. The backend enforces one record per member per event."
        >
          <div className="form-grid form-grid-2">
            <label className="field">
              <span>Search member directory</span>
              <input
                placeholder="Search by name, email, or phone"
                value={candidateSearch}
                onChange={(event) => setCandidateSearch(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Choose member</span>
              <select
                required
                value={addFormState.member_id}
                onChange={(event) =>
                  setAddFormState((current) => ({
                    ...current,
                    member_id: event.target.value,
                  }))
                }
              >
                <option value="">Select a member</option>
                {candidateMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                    {member.email ? ` · ${member.email}` : member.phone_number ? ` · ${member.phone_number}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Status</span>
              <select
                value={addFormState.status}
                onChange={(event) =>
                  setAddFormState((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
              >
                {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Checked in at</span>
              <input
                type="datetime-local"
                value={addFormState.checked_in_at}
                onChange={(event) =>
                  setAddFormState((current) => ({
                    ...current,
                    checked_in_at: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <label className="field">
            <span>Attendance notes</span>
            <textarea
              rows={4}
              value={addFormState.notes}
              onChange={(event) =>
                setAddFormState((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
            />
          </label>

          <p className="muted-text helper-text">
            {candidateMembersQuery.isLoading
              ? "Loading candidate members..."
              : candidateMembers.length > 0
                ? `${candidateMembers.length} eligible member${candidateMembers.length === 1 ? "" : "s"} found.`
                : "No eligible members match the current search."}
          </p>
        </FormSection>

        <ErrorAlert
          error={createMemberAttendanceMutation.error}
          fallbackMessage="The member attendance record could not be created."
        />

        <div className="inline-actions">
          <button
            className="button button-primary"
            disabled={createMemberAttendanceMutation.isPending}
            type="submit"
          >
            {createMemberAttendanceMutation.isPending ? "Adding..." : "Add member attendance"}
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              setAddFormState(emptyMemberAttendanceForm);
              setCandidateSearch("");
            }}
            type="button"
          >
            Reset form
          </button>
        </div>
      </form>

      {selectedMemberAttendance ? (
        <form
          className="page-stack"
          onSubmit={(event) => {
            event.preventDefault();
            updateMemberAttendanceMutation.mutate(toMemberAttendanceUpdatePayload(editFormState));
          }}
        >
          <FormSection
            title={`Edit attendance record: ${formatMemberName(selectedMemberAttendance)}`}
            description="Update the current member attendance status, check-in timestamp, and notes."
          >
            <div className="form-grid form-grid-2">
              <label className="field">
                <span>Status</span>
                <select
                  value={editFormState.status}
                  onChange={(event) =>
                    setEditFormState((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Checked in at</span>
                <input
                  type="datetime-local"
                  value={editFormState.checked_in_at}
                  onChange={(event) =>
                    setEditFormState((current) => ({
                      ...current,
                      checked_in_at: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <label className="field">
              <span>Attendance notes</span>
              <textarea
                rows={4}
                value={editFormState.notes}
                onChange={(event) =>
                  setEditFormState((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
          </FormSection>

          <ErrorAlert
            error={updateMemberAttendanceMutation.error}
            fallbackMessage="The member attendance record could not be updated."
          />

          <div className="inline-actions">
            <button
              className="button button-primary"
              disabled={updateMemberAttendanceMutation.isPending}
              type="submit"
            >
              {updateMemberAttendanceMutation.isPending ? "Saving..." : "Save attendance record"}
            </button>
            <button
              className="button button-secondary"
              onClick={() => {
                setSelectedMemberAttendanceId(null);
                setEditFormState(emptyMemberAttendanceEditForm);
              }}
              type="button"
            >
              Close editor
            </button>
          </div>
        </form>
      ) : (
        <EmptyState
          title="No member attendance record selected"
          description="Choose a row above to edit the attendance status, timestamp, or notes."
        />
      )}
    </div>
  );
}
