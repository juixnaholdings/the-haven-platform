"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { queryClient } from "@/api/queryClient";
import {
  EmptyState,
  EntityTable,
  ErrorAlert,
  ErrorState,
  FormModalShell,
  FormSection,
  LoadingState,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components";
import { attendanceApi } from "@/domains/attendance/api";
import {
  ATTENDANCE_STATUS_OPTIONS,
  getAttendanceStatusLabel,
  getServiceEventTypeLabel,
} from "@/domains/attendance/options";
import { membersApi } from "@/domains/members/api";
import type {
  AttendanceSummaryWritePayload,
  MemberAttendanceCreatePayload,
  MemberAttendanceUpdatePayload,
} from "@/domains/types";
import { formatDate, formatDateTime, toDateTimeLocalInputValue, toIsoDateTime } from "@/lib/formatters";
import { formatMemberName } from "@/lib/members";

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

function getAttendanceProgressTone(status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED") {
  if (status === "COMPLETED") {
    return "success" as const;
  }
  if (status === "IN_PROGRESS") {
    return "warning" as const;
  }
  return "muted" as const;
}

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

function toMemberAttendancePayload(formState: MemberAttendanceFormState): MemberAttendanceCreatePayload {
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

export function EventAttendancePageScreen() {
  const params = useParams<{ serviceEventId: string }>();
  const numericServiceEventId = Number(params.serviceEventId);
  const [memberSearch, setMemberSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [summaryFormOverrides, setSummaryFormOverrides] = useState<Partial<SummaryFormState>>({});
  const [addFormState, setAddFormState] = useState<MemberAttendanceFormState>(emptyMemberAttendanceForm);
  const [selectedMemberAttendanceId, setSelectedMemberAttendanceId] = useState<number | null>(null);
  const [editFormOverrides, setEditFormOverrides] = useState<Partial<MemberAttendanceEditFormState>>({});
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditMemberModalOpen, setIsEditMemberModalOpen] = useState(false);
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

  const baseSummaryFormState = useMemo<SummaryFormState>(() => {
    const summary = serviceEventQuery.data?.attendance_summary;
    if (!summary) {
      return emptySummaryForm;
    }

    return {
      men_count: String(summary.men_count),
      women_count: String(summary.women_count),
      children_count: String(summary.children_count),
      visitor_count: String(summary.visitor_count),
      notes: summary.notes || "",
    };
  }, [serviceEventQuery.data?.attendance_summary]);

  const summaryFormState = useMemo<SummaryFormState>(
    () => ({
      ...baseSummaryFormState,
      ...summaryFormOverrides,
    }),
    [baseSummaryFormState, summaryFormOverrides],
  );

  const existingMemberIds = useMemo(
    () =>
      new Set(
        (serviceEventQuery.data?.member_attendances ?? []).map((memberAttendance) => memberAttendance.member_id),
      ),
    [serviceEventQuery.data?.member_attendances],
  );

  const candidateMembers = (candidateMembersQuery.data ?? []).filter(
    (member) => !existingMemberIds.has(member.id),
  );

  const selectedMemberAttendance =
    serviceEventQuery.data?.member_attendances.find(
      (memberAttendance) => memberAttendance.id === selectedMemberAttendanceId,
    ) ?? null;

  const baseEditFormState = useMemo<MemberAttendanceEditFormState>(() => {
    if (!selectedMemberAttendance) {
      return emptyMemberAttendanceEditForm;
    }

    return {
      status: selectedMemberAttendance.status,
      checked_in_at: toDateTimeLocalInputValue(selectedMemberAttendance.checked_in_at),
      notes: selectedMemberAttendance.notes || "",
    };
  }, [selectedMemberAttendance]);

  const editFormState = useMemo<MemberAttendanceEditFormState>(
    () => ({
      ...baseEditFormState,
      ...editFormOverrides,
    }),
    [baseEditFormState, editFormOverrides],
  );

  const saveSummaryMutation = useMutation({
    mutationFn: (payload: AttendanceSummaryWritePayload) =>
      attendanceApi.upsertAttendanceSummary(numericServiceEventId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["service-event", numericServiceEventId] });
      await queryClient.invalidateQueries({ queryKey: ["service-events"] });
      await queryClient.invalidateQueries({ queryKey: ["attendance-overview"] });
      setSummaryFormOverrides({});
      setIsSummaryModalOpen(false);
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
      setIsAddMemberModalOpen(false);
    },
  });

  const updateMemberAttendanceMutation = useMutation({
    mutationFn: (payload: MemberAttendanceUpdatePayload) => {
      if (!selectedMemberAttendanceId) {
        throw new Error("No member attendance record selected.");
      }

      return attendanceApi.updateMemberAttendance(numericServiceEventId, selectedMemberAttendanceId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["service-event", numericServiceEventId] });
      await queryClient.invalidateQueries({ queryKey: ["member-attendance", numericServiceEventId] });
      await queryClient.invalidateQueries({ queryKey: ["attendance-overview"] });
      setEditFormOverrides({});
      setIsEditMemberModalOpen(false);
    },
  });

  if (!Number.isFinite(numericServiceEventId)) {
    return (
      <ErrorState
        description="The requested event identifier is not valid."
        error={new Error("Invalid attendance route.")}
        title="Attendance route is invalid"
      />
    );
  }

  if (serviceEventQuery.isLoading || memberAttendanceQuery.isLoading) {
    return (
      <LoadingState
        description="Fetching the event profile, summary attendance, and member attendance records."
        title="Loading attendance workflow"
      />
    );
  }

  if (serviceEventQuery.error || memberAttendanceQuery.error || !serviceEventQuery.data) {
    return (
      <ErrorState
        error={serviceEventQuery.error ?? memberAttendanceQuery.error ?? new Error("Event not found.")}
        onRetry={() => {
          void serviceEventQuery.refetch();
          void memberAttendanceQuery.refetch();
        }}
        title="Attendance workflow could not be loaded"
      />
    );
  }

  const serviceEvent = serviceEventQuery.data;
  const memberAttendanceRecords = memberAttendanceQuery.data ?? [];
  const summaryPayload = toSummaryPayload(summaryFormState);
  const hasSummary = Boolean(serviceEvent.attendance_summary);

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link className="button button-secondary" href={`/events/${serviceEvent.id}`}>
              Back to event
            </Link>
            <button
              className="button button-ghost"
              onClick={() => setIsSummaryModalOpen(true)}
              type="button"
            >
              {hasSummary ? "Correct summary" : "Record summary"}
            </button>
            <button
              className="button button-primary"
              onClick={() => setIsAddMemberModalOpen(true)}
              type="button"
            >
              Add member attendance
            </button>
            <Link className="button button-ghost" href="/attendance">
              Attendance overview
            </Link>
          </div>
        }
        description="Summary attendance and member-level attendance are intentionally separate. The backend does not force them to reconcile, so this screen keeps both flows explicit."
        eyebrow="Attendance recording"
        meta={
          <>
            <StatusBadge label={getServiceEventTypeLabel(serviceEvent.event_type)} tone="info" />
            <StatusBadge
              label={serviceEvent.is_active ? "Active event" : "Inactive event"}
              tone={serviceEvent.is_active ? "success" : "muted"}
            />
            <StatusBadge
              label={serviceEvent.attendance_progress_label}
              tone={getAttendanceProgressTone(serviceEvent.attendance_progress_status)}
            />
          </>
        }
        title={serviceEvent.title}
      />

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Service date" tone="accent" value={formatDate(serviceEvent.service_date)} />
        <StatCard label="Summary total" value={summaryPayload.total_count} />
        <StatCard label="Visitors" value={summaryPayload.visitor_count} />
        <StatCard label="Member records" value={serviceEvent.member_attendance_count} />
        <StatCard label="Completion" value={`${serviceEvent.attendance_progress_percent}%`} />
        <StatCard label="Attendance updated" value={formatDateTime(serviceEvent.attendance_last_updated_at)} />
      </section>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Event context</h3>
              <p className="m-0 text-sm text-slate-500">Operational event context for the current attendance session.</p>
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
              <dt>Attendance last updated</dt>
              <dd>{formatDateTime(serviceEvent.attendance_last_updated_at)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Current distinction</h3>
              <p className="m-0 text-sm text-slate-500">This is the important backend caveat for attendance screens.</p>
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

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Summary attendance</h3>
            <p className="m-0 text-sm text-slate-500">
              Anonymous summary counts remain separate from member rows in the current backend model.
            </p>
          </div>
          <button
            className="button button-secondary"
            onClick={() => setIsSummaryModalOpen(true)}
            type="button"
          >
            {hasSummary ? "Correct summary" : "Record summary"}
          </button>
        </div>
        <dl className="definition-list">
          <div>
            <dt>Men</dt>
            <dd>{summaryPayload.men_count}</dd>
          </div>
          <div>
            <dt>Women</dt>
            <dd>{summaryPayload.women_count}</dd>
          </div>
          <div>
            <dt>Children</dt>
            <dd>{summaryPayload.children_count}</dd>
          </div>
          <div>
            <dt>Visitors</dt>
            <dd>{summaryPayload.visitor_count}</dd>
          </div>
          <div>
            <dt>Derived total</dt>
            <dd>{summaryPayload.total_count}</dd>
          </div>
          <div>
            <dt>Summary last updated</dt>
            <dd>{formatDateTime(serviceEvent.attendance_summary?.updated_at)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Member attendance records</h3>
            <p className="m-0 text-sm text-slate-500">Filter and manage per-member attendance records for this event.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="field">
            <span>Search records</span>
            <input
              onChange={(event) => setMemberSearch(event.target.value)}
              placeholder="Search by member name or email"
              value={memberSearch}
            />
          </label>

          <label className="field">
            <span>Status</span>
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
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
            description="Add a member attendance record below or broaden the current filters."
            title="No member attendance records matched"
          />
        ) : (
          <EntityTable
            columns={[
              {
                header: "Member",
                cell: (memberAttendance) => (
                  <div className="grid gap-1">
                    <Link className="font-semibold text-[#16335f] hover:underline" href={`/members/${memberAttendance.member_id}`}>
                      {formatMemberName(memberAttendance)}
                    </Link>
                    <span className="block text-xs text-slate-500">{memberAttendance.email || "Profile-only record"}</span>
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
                header: "Last updated",
                cell: (memberAttendance) => formatDateTime(memberAttendance.updated_at),
              },
              {
                header: "Actions",
                className: "cell-actions",
                cell: (memberAttendance) => (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      className="button button-ghost button-compact"
                      onClick={() => {
                        setSelectedMemberAttendanceId(memberAttendance.id);
                        setEditFormOverrides({});
                        setIsEditMemberModalOpen(true);
                      }}
                      type="button"
                    >
                      Correct record
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

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Member attendance actions</h3>
            <p className="m-0 text-sm text-slate-500">
              Add new records or edit existing rows in modal workflows.
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={() => setIsAddMemberModalOpen(true)}
            type="button"
          >
            Add member attendance
          </button>
        </div>
        {selectedMemberAttendance ? (
          <p className="m-0 text-sm text-slate-500">
            Selected for edit: <strong>{formatMemberName(selectedMemberAttendance)}</strong>
          </p>
        ) : (
          <p className="m-0 text-sm text-slate-500">
            Choose a row above to edit attendance status, timestamp, or notes.
          </p>
        )}
      </section>

      <FormModalShell
        description="Total attendance is derived from men + women + children because that is the backend validation rule."
        footer={
          <>
            <button
              className="button button-secondary"
              onClick={() => setIsSummaryModalOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              disabled={saveSummaryMutation.isPending}
              form="attendance-summary-modal-form"
              type="submit"
            >
              {saveSummaryMutation.isPending ? "Saving..." : "Save summary attendance"}
            </button>
          </>
        }
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        size="large"
        title="Summary attendance"
      >
        <form
          className="space-y-6"
          id="attendance-summary-modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            saveSummaryMutation.mutate(summaryPayload);
          }}
        >
          <FormSection title="Summary counts">
            <div className="grid gap-4 xl:grid-cols-3">
              <label className="field">
                <span>Men</span>
                <input
                  min="0"
                  onChange={(event) =>
                    setSummaryFormOverrides((current) => ({
                      ...current,
                      men_count: event.target.value,
                    }))
                  }
                  type="number"
                  value={summaryFormState.men_count}
                />
              </label>

              <label className="field">
                <span>Women</span>
                <input
                  min="0"
                  onChange={(event) =>
                    setSummaryFormOverrides((current) => ({
                      ...current,
                      women_count: event.target.value,
                    }))
                  }
                  type="number"
                  value={summaryFormState.women_count}
                />
              </label>

              <label className="field">
                <span>Children</span>
                <input
                  min="0"
                  onChange={(event) =>
                    setSummaryFormOverrides((current) => ({
                      ...current,
                      children_count: event.target.value,
                    }))
                  }
                  type="number"
                  value={summaryFormState.children_count}
                />
              </label>

              <label className="field">
                <span>Visitors</span>
                <input
                  min="0"
                  onChange={(event) =>
                    setSummaryFormOverrides((current) => ({
                      ...current,
                      visitor_count: event.target.value,
                    }))
                  }
                  type="number"
                  value={summaryFormState.visitor_count}
                />
              </label>

              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <dt>Derived total attendance</dt>
                <dd>{summaryPayload.total_count}</dd>
              </div>
            </div>

            <label className="field">
              <span>Summary notes</span>
              <textarea
                onChange={(event) =>
                  setSummaryFormOverrides((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                rows={4}
                value={summaryFormState.notes}
              />
            </label>
          </FormSection>

          <ErrorAlert
            error={saveSummaryMutation.error}
            fallbackMessage="The attendance summary could not be saved."
          />
        </form>
      </FormModalShell>

      <FormModalShell
        description="Use the active member directory for member-level attendance. The backend enforces one record per member per event."
        footer={
          <>
            <button
              className="button button-secondary"
              onClick={() => setIsAddMemberModalOpen(false)}
              type="button"
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              disabled={createMemberAttendanceMutation.isPending}
              form="add-member-attendance-modal-form"
              type="submit"
            >
              {createMemberAttendanceMutation.isPending ? "Adding..." : "Add member attendance"}
            </button>
          </>
        }
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        size="large"
        title="Add member attendance"
      >
        <form
          className="space-y-6"
          id="add-member-attendance-modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            createMemberAttendanceMutation.mutate(toMemberAttendancePayload(addFormState));
          }}
        >
          <FormSection title="Member attendance record">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field">
                <span>Search member directory</span>
                <input
                  onChange={(event) => setCandidateSearch(event.target.value)}
                  placeholder="Search by name, email, or phone"
                  value={candidateSearch}
                />
              </label>

              <label className="field">
                <span>Choose member</span>
                <select
                  onChange={(event) =>
                    setAddFormState((current) => ({
                      ...current,
                      member_id: event.target.value,
                    }))
                  }
                  required
                  value={addFormState.member_id}
                >
                  <option value="">Select a member</option>
                  {candidateMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                      {member.email
                        ? ` | ${member.email}`
                        : member.phone_number
                          ? ` | ${member.phone_number}`
                          : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Status</span>
                <select
                  onChange={(event) =>
                    setAddFormState((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  value={addFormState.status}
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
                  onChange={(event) =>
                    setAddFormState((current) => ({
                      ...current,
                      checked_in_at: event.target.value,
                    }))
                  }
                  type="datetime-local"
                  value={addFormState.checked_in_at}
                />
              </label>
            </div>

            <label className="field">
              <span>Attendance notes</span>
              <textarea
                onChange={(event) =>
                  setAddFormState((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                rows={4}
                value={addFormState.notes}
              />
            </label>

            <p className="m-0 text-sm text-slate-500">
              {candidateMembersQuery.isLoading
                ? "Loading candidate members..."
                : candidateMembers.length > 0
                  ? `${candidateMembers.length} eligible member${candidateMembers.length === 1 ? "" : "s"} found.`
                  : "No eligible members match the current search."}
            </p>
            <p className="m-0 text-sm text-slate-500">
              Duplicate prevention is active: each member can only have one attendance record per event.
            </p>
          </FormSection>

          <ErrorAlert
            error={createMemberAttendanceMutation.error}
            fallbackMessage="The member attendance record could not be created."
          />
        </form>
      </FormModalShell>

      <FormModalShell
        description="Update the selected member attendance status, check-in timestamp, and notes."
        footer={
          <>
            <button
              className="button button-secondary"
              onClick={() => {
                setIsEditMemberModalOpen(false);
                setSelectedMemberAttendanceId(null);
                setEditFormOverrides({});
              }}
              type="button"
            >
              Close
            </button>
            <button
              className="button button-primary"
              disabled={updateMemberAttendanceMutation.isPending || !selectedMemberAttendance}
              form="edit-member-attendance-modal-form"
              type="submit"
            >
              {updateMemberAttendanceMutation.isPending ? "Saving..." : "Save attendance record"}
            </button>
          </>
        }
        isOpen={isEditMemberModalOpen && Boolean(selectedMemberAttendance)}
        onClose={() => {
          setIsEditMemberModalOpen(false);
          setSelectedMemberAttendanceId(null);
          setEditFormOverrides({});
        }}
        size="large"
        title={
          selectedMemberAttendance
            ? `Edit attendance record: ${formatMemberName(selectedMemberAttendance)}`
            : "Edit attendance record"
        }
      >
        <form
          className="space-y-6"
          id="edit-member-attendance-modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            updateMemberAttendanceMutation.mutate(toMemberAttendanceUpdatePayload(editFormState));
          }}
        >
          <FormSection title="Attendance status">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field">
                <span>Status</span>
                <select
                  onChange={(event) =>
                    setEditFormOverrides((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                  value={editFormState.status}
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
                  onChange={(event) =>
                    setEditFormOverrides((current) => ({
                      ...current,
                      checked_in_at: event.target.value,
                    }))
                  }
                  type="datetime-local"
                  value={editFormState.checked_in_at}
                />
              </label>
            </div>

            <label className="field">
              <span>Attendance notes</span>
              <textarea
                onChange={(event) =>
                  setEditFormOverrides((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                rows={4}
                value={editFormState.notes}
              />
            </label>
          </FormSection>

          <ErrorAlert
            error={updateMemberAttendanceMutation.error}
            fallbackMessage="The member attendance record could not be updated."
          />
        </form>
      </FormModalShell>
    </div>
  );
}
