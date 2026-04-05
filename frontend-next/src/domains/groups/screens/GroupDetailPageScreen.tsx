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
import { groupsApi } from "@/domains/groups/api";
import { membersApi } from "@/domains/members/api";
import type {
  GroupMembershipCreatePayload,
  GroupMembershipUpdatePayload,
  GroupWritePayload,
} from "@/domains/types";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { formatMemberName } from "@/lib/members";

interface GroupFormState {
  name: string;
  description: string;
  is_active: boolean;
}

interface AddMemberFormState {
  member_id: string;
  role_name: string;
  started_on: string;
  notes: string;
}

interface MembershipFormState {
  role_name: string;
  started_on: string;
  ended_on: string;
  is_active: boolean;
  notes: string;
}

const emptyGroupForm: GroupFormState = {
  name: "",
  description: "",
  is_active: true,
};

const emptyAddMemberForm: AddMemberFormState = {
  member_id: "",
  role_name: "",
  started_on: "",
  notes: "",
};

const emptyMembershipForm: MembershipFormState = {
  role_name: "",
  started_on: "",
  ended_on: "",
  is_active: true,
  notes: "",
};

function toGroupPayload(formState: GroupFormState): GroupWritePayload {
  return {
    name: formState.name,
    description: formState.description || undefined,
    is_active: formState.is_active,
  };
}

function toAddMemberPayload(formState: AddMemberFormState): GroupMembershipCreatePayload {
  return {
    member_id: Number(formState.member_id),
    role_name: formState.role_name || undefined,
    started_on: formState.started_on || null,
    notes: formState.notes || undefined,
  };
}

function toMembershipPayload(formState: MembershipFormState): GroupMembershipUpdatePayload {
  return {
    role_name: formState.role_name || undefined,
    started_on: formState.started_on || null,
    ended_on: formState.ended_on || null,
    is_active: formState.is_active,
    notes: formState.notes || undefined,
  };
}

export function GroupDetailPageScreen() {
  const params = useParams<{ groupId: string }>();
  const numericGroupId = Number(params.groupId);
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [groupFormOverrides, setGroupFormOverrides] = useState<Partial<GroupFormState>>({});
  const [memberSearch, setMemberSearch] = useState("");
  const [addMemberFormState, setAddMemberFormState] = useState<AddMemberFormState>(emptyAddMemberForm);
  const [selectedMembershipId, setSelectedMembershipId] = useState<number | null>(null);
  const [membershipFormOverrides, setMembershipFormOverrides] = useState<Partial<MembershipFormState>>(
    {},
  );
  const deferredMemberSearch = useDeferredValue(memberSearch);

  const groupQuery = useQuery({
    enabled: Number.isFinite(numericGroupId),
    queryKey: ["group", numericGroupId],
    queryFn: () => groupsApi.getGroup(numericGroupId),
  });

  const baseGroupFormState = useMemo<GroupFormState>(() => {
    if (!groupQuery.data) {
      return emptyGroupForm;
    }

    return {
      name: groupQuery.data.name,
      description: groupQuery.data.description || "",
      is_active: groupQuery.data.is_active,
    };
  }, [groupQuery.data]);

  const groupFormState = useMemo<GroupFormState>(
    () => ({
      ...baseGroupFormState,
      ...groupFormOverrides,
    }),
    [baseGroupFormState, groupFormOverrides],
  );

  const candidateMembersQuery = useQuery({
    enabled: Number.isFinite(numericGroupId),
    queryKey: ["members", "group-candidates", { search: deferredMemberSearch }],
    queryFn: () =>
      membersApi.listMembers({
        search: deferredMemberSearch || undefined,
        is_active: true,
      }),
  });

  const activeMemberIds = useMemo(
    () =>
      new Set(
        (groupQuery.data?.memberships ?? [])
          .filter((membership) => membership.is_active)
          .map((membership) => membership.member_id),
      ),
    [groupQuery.data?.memberships],
  );

  const candidateMembers = (candidateMembersQuery.data ?? []).filter(
    (member) => !activeMemberIds.has(member.id),
  );

  const selectedMembership =
    groupQuery.data?.memberships.find((membership) => membership.id === selectedMembershipId) ?? null;

  const baseMembershipFormState = useMemo<MembershipFormState>(() => {
    if (!selectedMembership) {
      return emptyMembershipForm;
    }

    return {
      role_name: selectedMembership.role_name || "",
      started_on: selectedMembership.started_on || "",
      ended_on: selectedMembership.ended_on || "",
      is_active: selectedMembership.is_active,
      notes: selectedMembership.notes || "",
    };
  }, [selectedMembership]);

  const membershipFormState = useMemo<MembershipFormState>(
    () => ({
      ...baseMembershipFormState,
      ...membershipFormOverrides,
    }),
    [baseMembershipFormState, membershipFormOverrides],
  );

  const updateGroupMutation = useMutation({
    mutationFn: (payload: Partial<GroupWritePayload>) => groupsApi.updateGroup(numericGroupId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      await queryClient.invalidateQueries({ queryKey: ["group", numericGroupId] });
      setGroupFormOverrides({});
      setIsEditGroupModalOpen(false);
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (payload: GroupMembershipCreatePayload) => groupsApi.addMember(numericGroupId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["group", numericGroupId] });
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      setAddMemberFormState(emptyAddMemberForm);
      setMemberSearch("");
      setIsAddMemberModalOpen(false);
    },
  });

  const updateMembershipMutation = useMutation({
    mutationFn: (payload: GroupMembershipUpdatePayload) => {
      if (!selectedMembershipId) {
        throw new Error("No ministry membership selected.");
      }

      return groupsApi.updateMembership(numericGroupId, selectedMembershipId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["group", numericGroupId] });
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      setMembershipFormOverrides({});
      setSelectedMembershipId(null);
    },
  });

  if (!Number.isFinite(numericGroupId)) {
    return (
      <ErrorState
        description="The requested ministry identifier is not valid."
        error={new Error("Invalid ministry identifier.")}
        title="Ministry route is invalid"
      />
    );
  }

  if (groupQuery.isLoading) {
    return (
      <LoadingState
        description="Fetching the ministry profile and current membership list."
        title="Loading ministry"
      />
    );
  }

  if (groupQuery.error || !groupQuery.data) {
    return (
      <ErrorState
        error={groupQuery.error ?? new Error("Ministry not found.")}
        onRetry={() => {
          void groupQuery.refetch();
        }}
        title="Ministry could not be loaded"
      />
    );
  }

  const group = groupQuery.data;
  const activeMembershipCount = group.memberships.filter((membership) => membership.is_active).length;
  const inactiveMembershipCount = group.memberships.length - activeMembershipCount;
  const isUpdateGroupSubmitDisabled = updateGroupMutation.isPending || !groupFormState.name.trim();
  const isAddMemberSubmitDisabled = addMemberMutation.isPending || !addMemberFormState.member_id;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="button button-primary"
              onClick={() => setIsEditGroupModalOpen(true)}
              type="button"
            >
              Edit ministry
            </button>
            <button
              className="button button-secondary"
              onClick={() => setIsAddMemberModalOpen(true)}
              type="button"
            >
              Add member
            </button>
            <Link className="button button-ghost" href="/groups">
              Back to ministries
            </Link>
          </div>
        }
        description="This screen uses the current flat group model as the ministry detail workflow. No parent-child ministry hierarchy is available yet."
        eyebrow="Groups / ministries"
        meta={
          <>
            <StatusBadge
              label={group.is_active ? "Active ministry" : "Inactive ministry"}
              tone={group.is_active ? "success" : "muted"}
            />
            <StatusBadge
              label={`${activeMembershipCount} active member${activeMembershipCount === 1 ? "" : "s"}`}
              tone="info"
            />
          </>
        }
        title={group.name}
      />

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active members" tone="accent" value={activeMembershipCount} />
        <StatCard label="Inactive members" value={inactiveMembershipCount} />
        <StatCard label="Created" value={formatDate(group.created_at)} />
      </section>

      <div className="grid gap-4 items-start grid-cols-1 2xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Ministry profile</h3>
              <p className="m-0 text-sm text-slate-500">Current name and description from the backend group record.</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <dt>Description</dt>
              <dd>{group.description || "No ministry description recorded."}</dd>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Record metadata</h3>
              <p className="m-0 text-sm text-slate-500">Ministry status and audit timestamps.</p>
            </div>
          </div>
          <dl className="grid gap-3.5 grid-cols-1">
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <dt>Status</dt>
              <dd>
                <StatusBadge
                  label={group.is_active ? "Active" : "Inactive"}
                  tone={group.is_active ? "success" : "muted"}
                />
              </dd>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <dt>Created</dt>
              <dd>{formatDateTime(group.created_at)}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <dt>Last updated</dt>
              <dd>{formatDateTime(group.updated_at)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <FormModalShell
        description="This form updates the current flat group record used for ministry management."
        footer={
          <>
            <button
              className="button button-secondary"
              onClick={() => {
                setGroupFormOverrides({});
                setIsEditGroupModalOpen(false);
              }}
              type="button"
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              disabled={isUpdateGroupSubmitDisabled}
              form="group-edit-form"
              type="submit"
            >
              {updateGroupMutation.isPending ? "Saving..." : "Save ministry changes"}
            </button>
          </>
        }
        isOpen={isEditGroupModalOpen}
        onClose={() => {
          setGroupFormOverrides({});
          setIsEditGroupModalOpen(false);
        }}
        size="large"
        title="Update ministry"
      >
        <form
          className="space-y-6"
          id="group-edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            updateGroupMutation.mutate(toGroupPayload(groupFormState));
          }}
        >
          <FormSection title="Ministry details">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="field">
                <span>Ministry name</span>
                <input
                  onChange={(event) =>
                    setGroupFormOverrides((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  required
                  value={groupFormState.name}
                />
              </label>

              <label className="checkbox-field checkbox-field-inline">
                <input
                  checked={groupFormState.is_active}
                  onChange={(event) =>
                    setGroupFormOverrides((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <span>Ministry is active</span>
              </label>
            </div>

            <label className="field">
              <span>Description</span>
              <textarea
                onChange={(event) =>
                  setGroupFormOverrides((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
                value={groupFormState.description}
              />
            </label>
          </FormSection>

          <ErrorAlert error={updateGroupMutation.error} fallbackMessage="The ministry could not be updated." />
        </form>
      </FormModalShell>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Ministry members</h3>
            <p className="m-0 text-sm text-slate-500">
              Roles and active state are managed per membership. The backend currently supports flat
              group memberships only.
            </p>
          </div>
          <button
            className="button button-secondary button-compact"
            onClick={() => setIsAddMemberModalOpen(true)}
            type="button"
          >
            Add member
          </button>
        </div>

        {group.memberships.length === 0 ? (
          <EmptyState
            description="Use the Add member action to start using this ministry operationally."
            title="No ministry memberships yet"
          />
        ) : (
          <EntityTable
            columns={[
              {
                header: "Member",
                cell: (membership) => (
                  <div className="grid gap-1">
                    <Link className="font-semibold text-[#16335f] hover:underline" href={`/members/${membership.member_id}`}>
                      {formatMemberName(membership)}
                    </Link>
                    <span className="block text-xs text-slate-500">{membership.email || "Profile-only record"}</span>
                  </div>
                ),
              },
              {
                header: "Role",
                cell: (membership) => membership.role_name || "General member",
              },
              {
                header: "Started",
                cell: (membership) => formatDate(membership.started_on),
              },
              {
                header: "Status",
                cell: (membership) => (
                  <StatusBadge
                    label={membership.is_active ? "Active" : "Inactive"}
                    tone={membership.is_active ? "success" : "muted"}
                  />
                ),
              },
              {
                header: "Actions",
                className: "cell-actions",
                cell: (membership) => (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      className={
                        selectedMembershipId === membership.id
                          ? "button button-secondary button-compact"
                          : "button button-ghost button-compact"
                      }
                      onClick={() => {
                        setSelectedMembershipId(membership.id);
                        setMembershipFormOverrides({});
                      }}
                      type="button"
                    >
                      {selectedMembershipId === membership.id ? "Editing" : "Edit membership"}
                    </button>
                  </div>
                ),
              },
            ]}
            getRowKey={(membership) => membership.id}
            rows={group.memberships}
          />
        )}
      </section>

      <FormModalShell
        description="Use the live member directory to assign a member into this ministry. Duplicate active memberships are still enforced by the backend."
        isOpen={isAddMemberModalOpen}
        onClose={() => {
          setAddMemberFormState(emptyAddMemberForm);
          setMemberSearch("");
          setIsAddMemberModalOpen(false);
        }}
        size="large"
        title="Add member to ministry"
      >
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          addMemberMutation.mutate(toAddMemberPayload(addMemberFormState));
        }}
      >
        <FormSection
          description="Use the live member directory to assign a member into this ministry. Duplicate active memberships are still enforced by the backend."
          title="Add member to ministry"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field">
              <span>Search member directory</span>
              <input
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Search by name, email, or phone"
                value={memberSearch}
              />
            </label>

            <label className="field">
              <span>Choose member</span>
              <select
                onChange={(event) =>
                  setAddMemberFormState((current) => ({
                    ...current,
                    member_id: event.target.value,
                  }))
                }
                required
                value={addMemberFormState.member_id}
              >
                <option value="">Select a member</option>
                {candidateMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name}
                    {member.email
                      ? ` · ${member.email}`
                      : member.phone_number
                        ? ` · ${member.phone_number}`
                        : ""}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Role name</span>
              <input
                onChange={(event) =>
                  setAddMemberFormState((current) => ({
                    ...current,
                    role_name: event.target.value,
                  }))
                }
                placeholder="Choir member, Teacher, Leader..."
                value={addMemberFormState.role_name}
              />
            </label>

            <label className="field">
              <span>Started on</span>
              <input
                onChange={(event) =>
                  setAddMemberFormState((current) => ({
                    ...current,
                    started_on: event.target.value,
                  }))
                }
                type="date"
                value={addMemberFormState.started_on}
              />
            </label>
          </div>

          <label className="field">
            <span>Membership notes</span>
            <textarea
              onChange={(event) =>
                setAddMemberFormState((current) => ({
                  ...current,
                  notes: event.target.value,
                }))
              }
              rows={4}
              value={addMemberFormState.notes}
            />
          </label>

          <p className="m-0 text-sm text-slate-500">
            {candidateMembersQuery.isLoading
              ? "Loading candidate members..."
              : candidateMembers.length > 0
                ? `${candidateMembers.length} eligible member${candidateMembers.length === 1 ? "" : "s"} found.`
                : "No eligible members match the current search."}
          </p>
        </FormSection>

        <ErrorAlert
          error={addMemberMutation.error}
          fallbackMessage="The member could not be added to this ministry."
        />

        <div className="flex flex-wrap items-center gap-2.5">
          <button className="button button-primary" disabled={isAddMemberSubmitDisabled} type="submit">
            {addMemberMutation.isPending ? "Adding..." : "Add member"}
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              setAddMemberFormState(emptyAddMemberForm);
              setMemberSearch("");
              setIsAddMemberModalOpen(false);
            }}
            type="button"
          >
            Reset form
          </button>
        </div>
      </form>
      </FormModalShell>

      <FormModalShell
        description="Update ministry role, dates, notes, and active state through the existing membership patch endpoint."
        isOpen={Boolean(selectedMembership)}
        onClose={() => {
          setSelectedMembershipId(null);
          setMembershipFormOverrides({});
        }}
        size="large"
        title={selectedMembership ? `Edit membership: ${formatMemberName(selectedMembership)}` : "Edit membership"}
      >
        {selectedMembership ? (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              updateMembershipMutation.mutate(toMembershipPayload(membershipFormState));
            }}
          >
            <FormSection title="Membership details">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="field">
                  <span>Role name</span>
                  <input
                    onChange={(event) =>
                      setMembershipFormOverrides((current) => ({
                        ...current,
                        role_name: event.target.value,
                      }))
                    }
                    value={membershipFormState.role_name}
                  />
                </label>

                <label className="field">
                  <span>Started on</span>
                  <input
                    onChange={(event) =>
                      setMembershipFormOverrides((current) => ({
                        ...current,
                        started_on: event.target.value,
                      }))
                    }
                    type="date"
                    value={membershipFormState.started_on}
                  />
                </label>

                <label className="field">
                  <span>Ended on</span>
                  <input
                    onChange={(event) =>
                      setMembershipFormOverrides((current) => ({
                        ...current,
                        ended_on: event.target.value,
                      }))
                    }
                    type="date"
                    value={membershipFormState.ended_on}
                  />
                </label>

                <label className="checkbox-field checkbox-field-inline">
                  <input
                    checked={membershipFormState.is_active}
                    onChange={(event) =>
                      setMembershipFormOverrides((current) => ({
                        ...current,
                        is_active: event.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <span>Membership is active</span>
                </label>
              </div>

              <label className="field">
                <span>Membership notes</span>
                <textarea
                  onChange={(event) =>
                    setMembershipFormOverrides((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  value={membershipFormState.notes}
                />
              </label>
            </FormSection>

            <ErrorAlert
              error={updateMembershipMutation.error}
              fallbackMessage="The ministry membership could not be updated."
            />

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                className="button button-primary"
                disabled={updateMembershipMutation.isPending}
                type="submit"
              >
                {updateMembershipMutation.isPending ? "Saving..." : "Save membership"}
              </button>
              <button
                className="button button-secondary"
                onClick={() => {
                  setSelectedMembershipId(null);
                  setMembershipFormOverrides({});
                }}
                type="button"
              >
                Close editor
              </button>
            </div>
          </form>
        ) : null}
      </FormModalShell>
    </div>
  );
}
