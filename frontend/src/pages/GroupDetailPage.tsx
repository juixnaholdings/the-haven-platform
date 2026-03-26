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
import { groupsApi } from "../domains/groups/api";
import { membersApi } from "../domains/members/api";
import type {
  GroupMembershipCreatePayload,
  GroupMembershipUpdatePayload,
  GroupWritePayload,
} from "../domains/types";
import { formatDate, formatDateTime } from "../utils/formatters";
import { formatMemberName } from "../utils/members";

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

export function GroupDetailPage() {
  const { groupId } = useParams();
  const numericGroupId = Number(groupId);
  const [groupFormState, setGroupFormState] = useState<GroupFormState>(emptyGroupForm);
  const [memberSearch, setMemberSearch] = useState("");
  const [addMemberFormState, setAddMemberFormState] =
    useState<AddMemberFormState>(emptyAddMemberForm);
  const [selectedMembershipId, setSelectedMembershipId] = useState<number | null>(null);
  const [membershipFormState, setMembershipFormState] =
    useState<MembershipFormState>(emptyMembershipForm);
  const deferredMemberSearch = useDeferredValue(memberSearch);

  const groupQuery = useQuery({
    enabled: Number.isFinite(numericGroupId),
    queryKey: ["group", numericGroupId],
    queryFn: () => groupsApi.getGroup(numericGroupId),
  });

  useEffect(() => {
    if (!groupQuery.data) {
      return;
    }

    setGroupFormState({
      name: groupQuery.data.name,
      description: groupQuery.data.description || "",
      is_active: groupQuery.data.is_active,
    });
  }, [groupQuery.data]);

  const candidateMembersQuery = useQuery({
    enabled: Number.isFinite(numericGroupId),
    queryKey: ["members", "group-candidates", { search: deferredMemberSearch }],
    queryFn: () =>
      membersApi.listMembers({
        search: deferredMemberSearch || undefined,
        is_active: true,
      }),
  });

  const activeMemberIds = new Set(
    (groupQuery.data?.memberships ?? [])
      .filter((membership) => membership.is_active)
      .map((membership) => membership.member_id),
  );

  const candidateMembers = (candidateMembersQuery.data ?? []).filter(
    (member) => !activeMemberIds.has(member.id),
  );

  const selectedMembership =
    groupQuery.data?.memberships.find((membership) => membership.id === selectedMembershipId) ??
    null;

  useEffect(() => {
    if (!selectedMembership) {
      setMembershipFormState(emptyMembershipForm);
      return;
    }

    setMembershipFormState({
      role_name: selectedMembership.role_name || "",
      started_on: selectedMembership.started_on || "",
      ended_on: selectedMembership.ended_on || "",
      is_active: selectedMembership.is_active,
      notes: selectedMembership.notes || "",
    });
  }, [selectedMembership]);

  const updateGroupMutation = useMutation({
    mutationFn: (payload: Partial<GroupWritePayload>) =>
      groupsApi.updateGroup(numericGroupId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      await queryClient.invalidateQueries({ queryKey: ["group", numericGroupId] });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: (payload: GroupMembershipCreatePayload) =>
      groupsApi.addMember(numericGroupId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["group", numericGroupId] });
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      setAddMemberFormState(emptyAddMemberForm);
      setMemberSearch("");
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
    },
  });

  if (!Number.isFinite(numericGroupId)) {
    return (
      <ErrorState
        title="Ministry route is invalid"
        description="The requested ministry identifier is not valid."
        error={new Error("Invalid ministry identifier.")}
      />
    );
  }

  if (groupQuery.isLoading) {
    return (
      <LoadingState
        title="Loading ministry"
        description="Fetching the ministry profile and current membership list."
      />
    );
  }

  if (groupQuery.error || !groupQuery.data) {
    return (
      <ErrorState
        title="Ministry could not be loaded"
        error={groupQuery.error ?? new Error("Ministry not found.")}
        onRetry={() => {
          void groupQuery.refetch();
        }}
      />
    );
  }

  const group = groupQuery.data;
  const activeMembershipCount = group.memberships.filter((membership) => membership.is_active).length;
  const inactiveMembershipCount = group.memberships.length - activeMembershipCount;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Groups / ministries"
        title={group.name}
        description="This screen uses the current flat group model as the ministry detail workflow. No parent-child ministry hierarchy is available yet."
        actions={
          <Link className="button button-secondary" to="/groups">
            Back to ministries
          </Link>
        }
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
      />

      <section className="metrics-grid">
        <StatCard label="Active members" value={activeMembershipCount} tone="accent" />
        <StatCard label="Inactive members" value={inactiveMembershipCount} />
        <StatCard label="Created" value={formatDate(group.created_at)} />
      </section>

      <div className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Ministry profile</h3>
              <p className="muted-text">Current name and description from the backend group record.</p>
            </div>
          </div>
          <div className="page-stack">
            <div className="detail-item">
              <dt>Description</dt>
              <dd>{group.description || "No ministry description recorded."}</dd>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Record metadata</h3>
              <p className="muted-text">Ministry status and audit timestamps.</p>
            </div>
          </div>
          <dl className="detail-grid detail-grid-1">
            <div className="detail-item">
              <dt>Status</dt>
              <dd>
                <StatusBadge
                  label={group.is_active ? "Active" : "Inactive"}
                  tone={group.is_active ? "success" : "muted"}
                />
              </dd>
            </div>
            <div className="detail-item">
              <dt>Created</dt>
              <dd>{formatDateTime(group.created_at)}</dd>
            </div>
            <div className="detail-item">
              <dt>Last updated</dt>
              <dd>{formatDateTime(group.updated_at)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <form
        className="page-stack"
        onSubmit={(event) => {
          event.preventDefault();
          updateGroupMutation.mutate(toGroupPayload(groupFormState));
        }}
      >
        <FormSection
          title="Update ministry"
          description="This form updates the current flat group record used for ministry management."
        >
          <div className="form-grid form-grid-2">
            <label className="field">
              <span>Ministry name</span>
              <input
                required
                value={groupFormState.name}
                onChange={(event) =>
                  setGroupFormState((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </label>

            <label className="checkbox-field checkbox-field-inline">
              <input
                checked={groupFormState.is_active}
                onChange={(event) =>
                  setGroupFormState((current) => ({
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
              rows={4}
              value={groupFormState.description}
              onChange={(event) =>
                setGroupFormState((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>
        </FormSection>

        <ErrorAlert
          error={updateGroupMutation.error}
          fallbackMessage="The ministry could not be updated."
        />

        <div className="inline-actions">
          <button
            className="button button-primary"
            disabled={updateGroupMutation.isPending}
            type="submit"
          >
            {updateGroupMutation.isPending ? "Saving..." : "Save ministry changes"}
          </button>
        </div>
      </form>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Ministry members</h3>
            <p className="muted-text">
              Roles and active state are managed per membership. The backend currently supports flat group memberships only.
            </p>
          </div>
        </div>

        {group.memberships.length === 0 ? (
          <EmptyState
            title="No ministry memberships yet"
            description="Add a member below to start using this ministry operationally."
          />
        ) : (
          <EntityTable
            columns={[
              {
                header: "Member",
                cell: (membership) => (
                  <div className="cell-stack">
                    <Link className="table-link" to={`/members/${membership.member_id}`}>
                      {formatMemberName(membership)}
                    </Link>
                    <span className="table-subtext">{membership.email || "Profile-only record"}</span>
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
                  <div className="inline-actions">
                    <button
                      className={
                        selectedMembershipId === membership.id
                          ? "button button-secondary button-compact"
                          : "button button-ghost button-compact"
                      }
                      onClick={() => setSelectedMembershipId(membership.id)}
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

      <form
        className="page-stack"
        onSubmit={(event) => {
          event.preventDefault();
          addMemberMutation.mutate(toAddMemberPayload(addMemberFormState));
        }}
      >
        <FormSection
          title="Add member to ministry"
          description="Use the live member directory to assign a member into this ministry. Duplicate active memberships are still enforced by the backend."
        >
          <div className="form-grid form-grid-2">
            <label className="field">
              <span>Search member directory</span>
              <input
                placeholder="Search by name, email, or phone"
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Choose member</span>
              <select
                required
                value={addMemberFormState.member_id}
                onChange={(event) =>
                  setAddMemberFormState((current) => ({
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
              <span>Role name</span>
              <input
                placeholder="Choir member, Teacher, Leader..."
                value={addMemberFormState.role_name}
                onChange={(event) =>
                  setAddMemberFormState((current) => ({
                    ...current,
                    role_name: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Started on</span>
              <input
                type="date"
                value={addMemberFormState.started_on}
                onChange={(event) =>
                  setAddMemberFormState((current) => ({
                    ...current,
                    started_on: event.target.value,
                  }))
                }
              />
            </label>
          </div>

          <label className="field">
            <span>Membership notes</span>
            <textarea
              rows={4}
              value={addMemberFormState.notes}
              onChange={(event) =>
                setAddMemberFormState((current) => ({
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
          error={addMemberMutation.error}
          fallbackMessage="The member could not be added to this ministry."
        />

        <div className="inline-actions">
          <button
            className="button button-primary"
            disabled={addMemberMutation.isPending}
            type="submit"
          >
            {addMemberMutation.isPending ? "Adding..." : "Add member"}
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              setAddMemberFormState(emptyAddMemberForm);
              setMemberSearch("");
            }}
            type="button"
          >
            Reset form
          </button>
        </div>
      </form>

      {selectedMembership ? (
        <form
          className="page-stack"
          onSubmit={(event) => {
            event.preventDefault();
            updateMembershipMutation.mutate(toMembershipPayload(membershipFormState));
          }}
        >
          <FormSection
            title={`Edit membership: ${formatMemberName(selectedMembership)}`}
            description="Update ministry role, dates, notes, and active state through the existing membership patch endpoint."
          >
            <div className="form-grid form-grid-2">
              <label className="field">
                <span>Role name</span>
                <input
                  value={membershipFormState.role_name}
                  onChange={(event) =>
                    setMembershipFormState((current) => ({
                      ...current,
                      role_name: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Started on</span>
                <input
                  type="date"
                  value={membershipFormState.started_on}
                  onChange={(event) =>
                    setMembershipFormState((current) => ({
                      ...current,
                      started_on: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="field">
                <span>Ended on</span>
                <input
                  type="date"
                  value={membershipFormState.ended_on}
                  onChange={(event) =>
                    setMembershipFormState((current) => ({
                      ...current,
                      ended_on: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="checkbox-field checkbox-field-inline">
                <input
                  checked={membershipFormState.is_active}
                  onChange={(event) =>
                    setMembershipFormState((current) => ({
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
                rows={4}
                value={membershipFormState.notes}
                onChange={(event) =>
                  setMembershipFormState((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
          </FormSection>

          <ErrorAlert
            error={updateMembershipMutation.error}
            fallbackMessage="The ministry membership could not be updated."
          />

          <div className="inline-actions">
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
                setMembershipFormState(emptyMembershipForm);
              }}
              type="button"
            >
              Close editor
            </button>
          </div>
        </form>
      ) : (
        <EmptyState
          title="No ministry membership selected"
          description="Choose a row above to edit role, dates, notes, or active state."
        />
      )}
    </div>
  );
}
