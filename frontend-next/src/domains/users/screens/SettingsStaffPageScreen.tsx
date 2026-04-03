"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/api/queryClient";
import {
  EmptyState,
  EntityTable,
  ErrorAlert,
  ErrorState,
  FilterActionStrip,
  FormModalShell,
  FormSection,
  LoadingState,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components";
import { usersApi } from "@/domains/users/api";
import type {
  BasicUserElevationPayload,
  BasicUserListItem,
  RoleSummary,
  StaffInviteCreatePayload,
  StaffInviteListItem,
  StaffUserCreatePayload,
  StaffUserListItem,
  StaffUserUpdatePayload,
} from "@/domains/types";
import { formatDateTime } from "@/lib/formatters";

type StaffStatusFilter = "all" | "active" | "inactive";
type InviteStatusFilter = "all" | "pending" | "accepted" | "revoked" | "expired";

interface StaffCreateFormState {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  is_active: boolean;
  role_ids: number[];
}

interface StaffUpdateFormState {
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role_ids: number[];
}

interface BasicUserElevationFormState {
  role_ids: number[];
  is_active: boolean;
}

interface StaffInviteFormState {
  email: string;
  role_ids: number[];
  expires_in_days: number;
}

const emptyCreateForm: StaffCreateFormState = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  password: "",
  is_active: true,
  role_ids: [],
};

const emptyUpdateForm: StaffUpdateFormState = {
  email: "",
  first_name: "",
  last_name: "",
  is_active: true,
  role_ids: [],
};

const emptyElevationForm: BasicUserElevationFormState = {
  role_ids: [],
  is_active: true,
};

const emptyInviteForm: StaffInviteFormState = {
  email: "",
  role_ids: [],
  expires_in_days: 7,
};

const EMPTY_STAFF_USERS: StaffUserListItem[] = [];
const EMPTY_BASIC_USERS: BasicUserListItem[] = [];
const EMPTY_STAFF_INVITES: StaffInviteListItem[] = [];

function toCreatePayload(formState: StaffCreateFormState): StaffUserCreatePayload {
  return {
    username: formState.username.trim(),
    email: formState.email.trim(),
    first_name: formState.first_name.trim() || undefined,
    last_name: formState.last_name.trim() || undefined,
    password: formState.password,
    is_active: formState.is_active,
    role_ids: formState.role_ids,
  };
}

function toUpdatePayload(formState: StaffUpdateFormState): StaffUserUpdatePayload {
  return {
    email: formState.email.trim() || undefined,
    first_name: formState.first_name.trim() || undefined,
    last_name: formState.last_name.trim() || undefined,
    is_active: formState.is_active,
    role_ids: formState.role_ids,
  };
}

function toElevationPayload(formState: BasicUserElevationFormState): BasicUserElevationPayload {
  return {
    role_ids: formState.role_ids,
    is_active: formState.is_active,
  };
}

function toInvitePayload(formState: StaffInviteFormState): StaffInviteCreatePayload {
  return {
    email: formState.email.trim(),
    role_ids: formState.role_ids,
    expires_in_days: formState.expires_in_days,
  };
}

function roleIdSetFromUser(user: { roles: { id: number }[] }): number[] {
  return user.roles.map((role) => role.id);
}

function toggleRoleIds(currentRoleIds: number[], roleId: number) {
  if (currentRoleIds.includes(roleId)) {
    return currentRoleIds.filter((id) => id !== roleId);
  }
  return [...currentRoleIds, roleId];
}

function sortRoles(roles: RoleSummary[]) {
  return [...roles].sort((left, right) => left.name.localeCompare(right.name));
}

function buildUpdateFormValues(
  selectedStaffUser: StaffUserListItem,
  overrides: Partial<StaffUpdateFormState>,
): StaffUpdateFormState {
  return {
    email: overrides.email ?? selectedStaffUser.email ?? "",
    first_name: overrides.first_name ?? selectedStaffUser.first_name ?? "",
    last_name: overrides.last_name ?? selectedStaffUser.last_name ?? "",
    is_active: overrides.is_active ?? selectedStaffUser.is_active,
    role_ids: overrides.role_ids ?? roleIdSetFromUser(selectedStaffUser),
  };
}

function deriveInviteStatus(invite: StaffInviteListItem): "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED" {
  if (invite.status === "PENDING" && invite.is_expired) {
    return "EXPIRED";
  }
  return invite.status;
}

function inviteFilterStatus(invite: StaffInviteListItem): InviteStatusFilter {
  const status = deriveInviteStatus(invite);
  if (status === "PENDING") return "pending";
  if (status === "ACCEPTED") return "accepted";
  if (status === "REVOKED") return "revoked";
  return "expired";
}

function inviteStatusBadge(invite: StaffInviteListItem): { label: string; tone: "success" | "muted" | "warning" | "info" } {
  const status = deriveInviteStatus(invite);
  if (status === "PENDING") return { label: "Pending", tone: "info" };
  if (status === "ACCEPTED") return { label: "Accepted", tone: "success" };
  if (status === "REVOKED") return { label: "Revoked", tone: "muted" };
  return { label: "Expired", tone: "warning" };
}

function canRevokeInvite(invite: StaffInviteListItem): boolean {
  return deriveInviteStatus(invite) === "PENDING";
}

function canCopyInvite(invite: StaffInviteListItem): boolean {
  return deriveInviteStatus(invite) === "PENDING" && Boolean(invite.invite_path);
}

export function SettingsStaffPageScreen() {
  const [staffSearch, setStaffSearch] = useState("");
  const [staffStatusFilter, setStaffStatusFilter] = useState<StaffStatusFilter>("all");
  const [selectedStaffUserId, setSelectedStaffUserId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormState, setCreateFormState] = useState<StaffCreateFormState>(emptyCreateForm);
  const [updateFormOverrides, setUpdateFormOverrides] = useState<Partial<StaffUpdateFormState>>({});

  const [basicUserSearch, setBasicUserSearch] = useState("");
  const [selectedBasicUserId, setSelectedBasicUserId] = useState<number | null>(null);
  const [elevationFormState, setElevationFormState] = useState<BasicUserElevationFormState>(
    emptyElevationForm,
  );

  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteStatusFilter, setInviteStatusFilter] = useState<InviteStatusFilter>("all");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteFormState, setInviteFormState] = useState<StaffInviteFormState>(emptyInviteForm);
  const [copiedInviteId, setCopiedInviteId] = useState<number | null>(null);

  const deferredStaffSearch = useDeferredValue(staffSearch);
  const deferredBasicUserSearch = useDeferredValue(basicUserSearch);
  const deferredInviteSearch = useDeferredValue(inviteSearch);

  const staffUsersQuery = useQuery({
    queryKey: ["settings", "staff-users"],
    queryFn: () => usersApi.listStaffUsers(),
  });

  const basicUsersQuery = useQuery({
    queryKey: ["settings", "basic-users"],
    queryFn: () => usersApi.listBasicUsers({ unassigned_only: true }),
  });

  const staffInvitesQuery = useQuery({
    queryKey: ["settings", "staff-invites"],
    queryFn: () => usersApi.listStaffInvites({ include_expired: true }),
  });

  const rolesQuery = useQuery({
    queryKey: ["settings", "roles"],
    queryFn: () => usersApi.listRoleSummaries(),
  });

  const allStaffUsers = staffUsersQuery.data ?? EMPTY_STAFF_USERS;
  const allBasicUsers = basicUsersQuery.data ?? EMPTY_BASIC_USERS;
  const allStaffInvites = staffInvitesQuery.data ?? EMPTY_STAFF_INVITES;

  const selectedUserStillExists = selectedStaffUserId
    ? allStaffUsers.some((user) => user.id === selectedStaffUserId)
    : false;
  const effectiveSelectedStaffUserId = selectedUserStillExists
    ? selectedStaffUserId
    : allStaffUsers[0]?.id ?? null;
  const selectedStaffUser =
    allStaffUsers.find((user) => user.id === effectiveSelectedStaffUserId) ?? null;
  const updateFormValues = selectedStaffUser
    ? buildUpdateFormValues(selectedStaffUser, updateFormOverrides)
    : emptyUpdateForm;
  const selectedBasicUser = allBasicUsers.find((user) => user.id === selectedBasicUserId) ?? null;

  const createStaffUserMutation = useMutation({
    mutationFn: (payload: StaffUserCreatePayload) => usersApi.createStaffUser(payload),
    onSuccess: async (createdStaffUser) => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "staff-users"] });
      await queryClient.invalidateQueries({ queryKey: ["settings", "roles"] });
      setCreateFormState(emptyCreateForm);
      setShowCreateForm(false);
      setSelectedStaffUserId(createdStaffUser.id);
      setUpdateFormOverrides({});
    },
  });

  const updateStaffUserMutation = useMutation({
    mutationFn: (payload: StaffUserUpdatePayload) => {
      if (!effectiveSelectedStaffUserId) {
        throw new Error("No staff user selected.");
      }
      return usersApi.updateStaffUser(effectiveSelectedStaffUserId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "staff-users"] });
      await queryClient.invalidateQueries({ queryKey: ["settings", "roles"] });
      setUpdateFormOverrides({});
    },
  });

  const elevateBasicUserMutation = useMutation({
    mutationFn: (payload: BasicUserElevationPayload) => {
      if (!selectedBasicUserId) {
        throw new Error("No basic user selected.");
      }
      return usersApi.elevateBasicUser(selectedBasicUserId, payload);
    },
    onSuccess: async (elevatedStaffUser) => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "staff-users"] });
      await queryClient.invalidateQueries({ queryKey: ["settings", "basic-users"] });
      await queryClient.invalidateQueries({ queryKey: ["settings", "roles"] });
      setSelectedBasicUserId(null);
      setElevationFormState(emptyElevationForm);
      setSelectedStaffUserId(elevatedStaffUser.id);
    },
  });

  const createStaffInviteMutation = useMutation({
    mutationFn: (payload: StaffInviteCreatePayload) => usersApi.createStaffInvite(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "staff-invites"] });
      setInviteFormState(emptyInviteForm);
      setShowInviteForm(false);
    },
  });

  const revokeStaffInviteMutation = useMutation({
    mutationFn: (staffInviteId: number) => usersApi.revokeStaffInvite(staffInviteId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "staff-invites"] });
    },
  });

  const sortedRoles = useMemo(() => sortRoles(rolesQuery.data ?? []), [rolesQuery.data]);

  const filteredStaffUsers = allStaffUsers.filter((user) => {
    const matchesSearch = deferredStaffSearch
      ? [user.full_name, user.username, user.email, ...user.role_names]
          .join(" ")
          .toLowerCase()
          .includes(deferredStaffSearch.toLowerCase())
      : true;

    const matchesStatus =
      staffStatusFilter === "all"
        ? true
        : staffStatusFilter === "active"
          ? user.is_active
          : !user.is_active;

    return matchesSearch && matchesStatus;
  });

  const filteredBasicUsers = allBasicUsers.filter((user) => {
    if (!deferredBasicUserSearch) {
      return true;
    }

    return [user.full_name, user.username, user.email]
      .join(" ")
      .toLowerCase()
      .includes(deferredBasicUserSearch.toLowerCase());
  });

  const filteredStaffInvites = allStaffInvites.filter((invite) => {
    const matchesSearch = deferredInviteSearch
      ? [invite.email, invite.invited_by_username, invite.accepted_user?.username ?? "", ...invite.role_names]
          .join(" ")
          .toLowerCase()
          .includes(deferredInviteSearch.toLowerCase())
      : true;
    const matchesStatus =
      inviteStatusFilter === "all" ? true : inviteFilterStatus(invite) === inviteStatusFilter;
    return matchesSearch && matchesStatus;
  });

  async function handleCopyInviteLink(invite: StaffInviteListItem) {
    if (!invite.invite_path || typeof window === "undefined" || !navigator.clipboard) {
      return;
    }

    try {
      await navigator.clipboard.writeText(`${window.location.origin}${invite.invite_path}`);
      setCopiedInviteId(invite.id);
      window.setTimeout(() => {
        setCopiedInviteId((current) => (current === invite.id ? null : current));
      }, 2200);
    } catch {
      setCopiedInviteId(null);
    }
  }

  if (
    staffUsersQuery.isLoading ||
    rolesQuery.isLoading ||
    basicUsersQuery.isLoading ||
    staffInvitesQuery.isLoading
  ) {
    return (
      <LoadingState
        description="Fetching staff users, pending basic users, invite lifecycle records, and role definitions."
        title="Loading staff lifecycle"
      />
    );
  }

  if (staffUsersQuery.error || rolesQuery.error || basicUsersQuery.error || staffInvitesQuery.error) {
    return (
      <ErrorState
        error={
          staffUsersQuery.error ??
          rolesQuery.error ??
          basicUsersQuery.error ??
          staffInvitesQuery.error ??
          new Error("Unknown settings error.")
        }
        onRetry={() => {
          void staffUsersQuery.refetch();
          void rolesQuery.refetch();
          void basicUsersQuery.refetch();
          void staffInvitesQuery.refetch();
        }}
        title="Staff lifecycle settings could not be loaded"
      />
    );
  }

  const staffHasFilters = Boolean(staffSearch.trim()) || staffStatusFilter !== "all";
  const invitesHasFilters = Boolean(inviteSearch.trim()) || inviteStatusFilter !== "all";
  const activeCount = allStaffUsers.filter((user) => user.is_active).length;
  const pendingElevationCount = allBasicUsers.length;
  const pendingInviteCount = allStaffInvites.filter((invite) => deriveInviteStatus(invite) === "PENDING").length;
  const acceptedInviteCount = allStaffInvites.filter((invite) => deriveInviteStatus(invite) === "ACCEPTED").length;

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <div className="inline-actions">
            <Link className="button button-secondary" href="/settings/roles">
              View roles
            </Link>
            <button
              className={showInviteForm ? "button button-secondary" : "button button-primary"}
              onClick={() => setShowInviteForm((current) => !current)}
              type="button"
            >
              {showInviteForm ? "Close invite form" : "Invite staff"}
            </button>
            <button
              className={showCreateForm ? "button button-secondary" : "button button-primary"}
              onClick={() => setShowCreateForm((current) => !current)}
              type="button"
            >
              {showCreateForm ? "Close create form" : "Add staff user"}
            </button>
          </div>
        }
        description="Public signups remain basic and roleless by default. Use this admin-only screen to elevate existing users, invite new staff candidates, and manage active staff assignments."
        eyebrow="Settings / staff users"
        meta={
          <>
            <StatusBadge label="Admin-controlled elevation" tone="success" />
            <StatusBadge label="Invite link onboarding" tone="info" />
          </>
        }
        title="Staff users"
      />

      <section className="metrics-grid">
        <StatCard label="Staff users" tone="accent" value={allStaffUsers.length} />
        <StatCard label="Active staff" value={activeCount} />
        <StatCard label="Pending basic users" value={pendingElevationCount} />
        <StatCard label="Pending invites" value={pendingInviteCount} />
        <StatCard label="Accepted invites" value={acceptedInviteCount} />
      </section>

      {showInviteForm ? (
        <form
          className="page-stack"
          onSubmit={(event) => {
            event.preventDefault();
            createStaffInviteMutation.mutate(toInvitePayload(inviteFormState));
          }}
        >
          <FormSection
            description="Create a secure invite link for a future staff user. Share the generated link manually when outbound email delivery is unavailable."
            title="Invite new staff"
          >
            <div className="form-grid form-grid-2">
              <label className="field">
                <span>Invite email</span>
                <input
                  onChange={(event) =>
                    setInviteFormState((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="future.staff@example.com"
                  required
                  type="email"
                  value={inviteFormState.email}
                />
              </label>

              <label className="field">
                <span>Expires in (days)</span>
                <input
                  max={30}
                  min={1}
                  onChange={(event) =>
                    setInviteFormState((current) => ({
                      ...current,
                      expires_in_days: Number(event.target.value) || 7,
                    }))
                  }
                  required
                  type="number"
                  value={inviteFormState.expires_in_days}
                />
              </label>
            </div>

            <div className="form-grid">
              <span className="field-label">Assign roles on acceptance</span>
              <div className="tag-list">
                {sortedRoles.map((role) => (
                  <label className="checkbox-field checkbox-field-inline" key={`invite-role-${role.id}`}>
                    <input
                      checked={inviteFormState.role_ids.includes(role.id)}
                      onChange={() =>
                        setInviteFormState((current) => ({
                          ...current,
                          role_ids: toggleRoleIds(current.role_ids, role.id),
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </FormSection>

          <ErrorAlert
            error={createStaffInviteMutation.error}
            fallbackMessage="The staff invite could not be created."
          />

          <div className="inline-actions">
            <button
              className="button button-primary"
              disabled={createStaffInviteMutation.isPending}
              type="submit"
            >
              {createStaffInviteMutation.isPending ? "Creating invite..." : "Create invite"}
            </button>
            <button
              className="button button-secondary"
              onClick={() => {
                setInviteFormState(emptyInviteForm);
                setShowInviteForm(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Pending basic users</h3>
            <p className="muted-text">
              Users created through public signup with no roles. Elevate them only when ready.
            </p>
          </div>
          <StatusBadge label={`${allBasicUsers.length} awaiting elevation`} tone="info" />
        </div>

        <FilterActionStrip
          actions={
            basicUserSearch.trim() ? (
              <button className="button button-secondary" onClick={() => setBasicUserSearch("")} type="button">
                Clear search
              </button>
            ) : null
          }
          search={
            <label className="field">
              <span>Search pending users</span>
              <input
                onChange={(event) => setBasicUserSearch(event.target.value)}
                placeholder="Search by name, username, or email"
                value={basicUserSearch}
              />
            </label>
          }
        />

        {filteredBasicUsers.length === 0 ? (
          <EmptyState
            description={
              basicUserSearch.trim()
                ? "Try a broader search term."
                : "Public signups with no assigned roles will appear here."
            }
            title={basicUserSearch.trim() ? "No pending users matched this search" : "No pending basic users"}
          />
        ) : (
          <EntityTable
            columns={[
              {
                header: "User",
                cell: (user) => (
                  <div className="cell-stack">
                    <strong>{user.full_name}</strong>
                    <span className="table-subtext">@{user.username}</span>
                  </div>
                ),
              },
              { header: "Email", cell: (user) => user.email || "-" },
              { header: "Joined", cell: (user) => formatDateTime(user.date_joined) },
              {
                header: "Status",
                cell: (user) => (
                  <StatusBadge
                    label={user.is_active ? "Active" : "Inactive"}
                    tone={user.is_active ? "success" : "muted"}
                  />
                ),
              },
              {
                header: "Actions",
                className: "cell-actions",
                cell: (user) => (
                  <button
                    className="button button-primary button-compact"
                    onClick={() => {
                      setSelectedBasicUserId(user.id);
                      setElevationFormState({
                        role_ids: roleIdSetFromUser(user),
                        is_active: user.is_active,
                      });
                    }}
                    type="button"
                  >
                    Elevate
                  </button>
                ),
              },
            ]}
            getRowKey={(user) => user.id}
            rows={filteredBasicUsers}
          />
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Staff invitations</h3>
            <p className="muted-text">
              Invite links support onboarding for future staff candidates who do not yet have accounts.
            </p>
          </div>
          <StatusBadge label={`${pendingInviteCount} pending`} tone="info" />
        </div>

        <FilterActionStrip
          actions={
            invitesHasFilters ? (
              <button
                className="button button-secondary"
                onClick={() => {
                  setInviteSearch("");
                  setInviteStatusFilter("all");
                }}
                type="button"
              >
                Clear filters
              </button>
            ) : null
          }
          filters={
            <label className="field">
              <span>Status</span>
              <select
                onChange={(event) => setInviteStatusFilter(event.target.value as InviteStatusFilter)}
                value={inviteStatusFilter}
              >
                <option value="all">All invites</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="revoked">Revoked</option>
                <option value="expired">Expired</option>
              </select>
            </label>
          }
          search={
            <label className="field">
              <span>Search invites</span>
              <input
                onChange={(event) => setInviteSearch(event.target.value)}
                placeholder="Search by email, role, or user"
                value={inviteSearch}
              />
            </label>
          }
        />

        {filteredStaffInvites.length === 0 ? (
          <EmptyState
            description={invitesHasFilters ? "Try a broader filter selection." : "No staff invites yet."}
            title={invitesHasFilters ? "No invites matched filters" : "No invites available"}
          />
        ) : (
          <EntityTable
            columns={[
              {
                header: "Invite email",
                cell: (invite) => (
                  <div className="cell-stack">
                    <strong>{invite.email}</strong>
                    <span className="table-subtext">Invited by {invite.invited_by_username || "system"}</span>
                  </div>
                ),
              },
              {
                header: "Roles",
                cell: (invite) =>
                  invite.role_names.length > 0 ? (
                    <div className="tag-list">
                      {invite.role_names.map((roleName) => (
                        <span className="tag" key={`${invite.id}-${roleName}`}>
                          {roleName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "No roles assigned"
                  ),
              },
              {
                header: "Status",
                cell: (invite) => {
                  const status = inviteStatusBadge(invite);
                  return <StatusBadge label={status.label} tone={status.tone} />;
                },
              },
              { header: "Expires", cell: (invite) => formatDateTime(invite.expires_at) },
              {
                header: "Accepted user",
                cell: (invite) => (invite.accepted_user ? `@${invite.accepted_user.username}` : "-"),
              },
              {
                header: "Actions",
                className: "cell-actions",
                cell: (invite) => (
                  <div className="inline-actions">
                    <button
                      className="button button-secondary button-compact"
                      disabled={!canCopyInvite(invite)}
                      onClick={() => {
                        void handleCopyInviteLink(invite);
                      }}
                      type="button"
                    >
                      {copiedInviteId === invite.id ? "Copied" : "Copy link"}
                    </button>
                    <button
                      className="button button-ghost button-compact"
                      disabled={!canRevokeInvite(invite) || revokeStaffInviteMutation.isPending}
                      onClick={() => revokeStaffInviteMutation.mutate(invite.id)}
                      type="button"
                    >
                      Revoke
                    </button>
                  </div>
                ),
              },
            ]}
            getRowKey={(invite) => invite.id}
            rows={filteredStaffInvites}
          />
        )}

        <ErrorAlert
          error={revokeStaffInviteMutation.error}
          fallbackMessage="The invite could not be updated."
        />
      </section>

      {showCreateForm ? (
        <form
          className="page-stack"
          onSubmit={(event) => {
            event.preventDefault();
            createStaffUserMutation.mutate(toCreatePayload(createFormState));
          }}
        >
          <FormSection
            description="Create a staff account directly and assign baseline roles."
            title="Add staff user"
          >
            <div className="form-grid form-grid-2">
              <label className="field">
                <span>Username</span>
                <input
                  onChange={(event) =>
                    setCreateFormState((current) => ({ ...current, username: event.target.value }))
                  }
                  required
                  value={createFormState.username}
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  onChange={(event) =>
                    setCreateFormState((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                  type="email"
                  value={createFormState.email}
                />
              </label>
              <label className="field">
                <span>First name</span>
                <input
                  onChange={(event) =>
                    setCreateFormState((current) => ({ ...current, first_name: event.target.value }))
                  }
                  value={createFormState.first_name}
                />
              </label>
              <label className="field">
                <span>Last name</span>
                <input
                  onChange={(event) =>
                    setCreateFormState((current) => ({ ...current, last_name: event.target.value }))
                  }
                  value={createFormState.last_name}
                />
              </label>
              <label className="field">
                <span>Temporary password</span>
                <input
                  minLength={8}
                  onChange={(event) =>
                    setCreateFormState((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                  type="password"
                  value={createFormState.password}
                />
              </label>
              <label className="checkbox-field checkbox-field-inline">
                <input
                  checked={createFormState.is_active}
                  onChange={(event) =>
                    setCreateFormState((current) => ({ ...current, is_active: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>User is active</span>
              </label>
            </div>

            <div className="form-grid">
              <span className="field-label">Assign roles</span>
              <div className="tag-list">
                {sortedRoles.map((role) => (
                  <label className="checkbox-field checkbox-field-inline" key={role.id}>
                    <input
                      checked={createFormState.role_ids.includes(role.id)}
                      onChange={() =>
                        setCreateFormState((current) => ({
                          ...current,
                          role_ids: toggleRoleIds(current.role_ids, role.id),
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </FormSection>

          <ErrorAlert
            error={createStaffUserMutation.error}
            fallbackMessage="The staff user could not be created."
          />

          <div className="inline-actions">
            <button
              className="button button-primary"
              disabled={createStaffUserMutation.isPending}
              type="submit"
            >
              {createStaffUserMutation.isPending ? "Creating..." : "Create staff user"}
            </button>
            <button
              className="button button-secondary"
              onClick={() => {
                setCreateFormState(emptyCreateForm);
                setShowCreateForm(false);
              }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Active staff directory</h3>
            <p className="muted-text">
              Review current staff assignment, active status, and role coverage.
            </p>
          </div>
        </div>

        <FilterActionStrip
          actions={
            staffHasFilters ? (
              <button
                className="button button-secondary"
                onClick={() => {
                  setStaffSearch("");
                  setStaffStatusFilter("all");
                }}
                type="button"
              >
                Clear filters
              </button>
            ) : null
          }
          filters={
            <label className="field">
              <span>Status</span>
              <select
                onChange={(event) => setStaffStatusFilter(event.target.value as StaffStatusFilter)}
                value={staffStatusFilter}
              >
                <option value="all">All staff users</option>
                <option value="active">Active users</option>
                <option value="inactive">Inactive users</option>
              </select>
            </label>
          }
          search={
            <label className="field">
              <span>Search staff users</span>
              <input
                onChange={(event) => setStaffSearch(event.target.value)}
                placeholder="Search by name, username, email, or role"
                value={staffSearch}
              />
            </label>
          }
        />

        {filteredStaffUsers.length === 0 ? (
          <EmptyState
            description={
              staffHasFilters
                ? "Try a broader search or clear current filters."
                : "Create or elevate a user to initialize staff workflows."
            }
            title={staffHasFilters ? "No staff users matched filters" : "No staff users available"}
          />
        ) : (
          <EntityTable
            columns={[
              {
                header: "User",
                cell: (user) => (
                  <div className="cell-stack">
                    <strong>{user.full_name}</strong>
                    <span className="table-subtext">@{user.username}</span>
                  </div>
                ),
              },
              { header: "Email", cell: (user) => user.email || "-" },
              {
                header: "Roles",
                cell: (user) =>
                  user.role_names.length > 0 ? (
                    <div className="tag-list">
                      {user.role_names.map((roleName) => (
                        <span className="tag" key={`${user.id}-${roleName}`}>
                          {roleName}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "No assigned roles"
                  ),
              },
              {
                header: "Access",
                cell: (user) => (
                  <div className="inline-actions">
                    <StatusBadge label={user.is_active ? "Active" : "Inactive"} tone={user.is_active ? "success" : "muted"} />
                    <StatusBadge label="Staff" tone="info" />
                    {user.is_superuser ? <StatusBadge label="Superuser" tone="warning" /> : null}
                  </div>
                ),
              },
              {
                header: "Actions",
                className: "cell-actions",
                cell: (user) => (
                  <button
                    className={
                      effectiveSelectedStaffUserId === user.id
                        ? "button button-secondary button-compact"
                        : "button button-ghost button-compact"
                    }
                    onClick={() => {
                      setSelectedStaffUserId(user.id);
                      setUpdateFormOverrides({});
                    }}
                    type="button"
                  >
                    {effectiveSelectedStaffUserId === user.id ? "Editing" : "Manage"}
                  </button>
                ),
              },
              { header: "Last login", cell: (user) => formatDateTime(user.last_login) },
            ]}
            getRowKey={(user) => user.id}
            rows={filteredStaffUsers}
          />
        )}
      </section>

      {selectedStaffUser ? (
        <form
          className="page-stack"
          onSubmit={(event) => {
            event.preventDefault();
            updateStaffUserMutation.mutate(toUpdatePayload(updateFormValues));
          }}
        >
          <FormSection
            description="Update identity fields, active status, and assigned roles for this staff account."
            title={`Edit staff user: ${selectedStaffUser.full_name}`}
          >
            <div className="form-grid form-grid-2">
              <label className="field">
                <span>Username</span>
                <input disabled value={selectedStaffUser.username} />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  onChange={(event) =>
                    setUpdateFormOverrides((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                  type="email"
                  value={updateFormValues.email}
                />
              </label>
              <label className="field">
                <span>First name</span>
                <input
                  onChange={(event) =>
                    setUpdateFormOverrides((current) => ({ ...current, first_name: event.target.value }))
                  }
                  value={updateFormValues.first_name}
                />
              </label>
              <label className="field">
                <span>Last name</span>
                <input
                  onChange={(event) =>
                    setUpdateFormOverrides((current) => ({ ...current, last_name: event.target.value }))
                  }
                  value={updateFormValues.last_name}
                />
              </label>
              <label className="checkbox-field checkbox-field-inline">
                <input
                  checked={updateFormValues.is_active}
                  onChange={(event) =>
                    setUpdateFormOverrides((current) => ({ ...current, is_active: event.target.checked }))
                  }
                  type="checkbox"
                />
                <span>User is active</span>
              </label>
            </div>

            <div className="form-grid">
              <span className="field-label">Assigned roles</span>
              <div className="tag-list">
                {sortedRoles.map((role) => (
                  <label className="checkbox-field checkbox-field-inline" key={`edit-${role.id}`}>
                    <input
                      checked={updateFormValues.role_ids.includes(role.id)}
                      onChange={() =>
                        setUpdateFormOverrides((current) => ({
                          ...current,
                          role_ids: toggleRoleIds(updateFormValues.role_ids, role.id),
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </FormSection>

          <ErrorAlert
            error={updateStaffUserMutation.error}
            fallbackMessage="The staff user could not be updated."
          />

          <div className="inline-actions">
            <button
              className="button button-primary"
              disabled={updateStaffUserMutation.isPending}
              type="submit"
            >
              {updateStaffUserMutation.isPending ? "Saving..." : "Save staff user"}
            </button>
            <button className="button button-secondary" onClick={() => setUpdateFormOverrides({})} type="button">
              Reset changes
            </button>
          </div>
        </form>
      ) : (
        <EmptyState
          description="Choose a staff record above to edit access and role assignments."
          title="No staff user selected"
        />
      )}

      <FormModalShell
        description={
          selectedBasicUser
            ? `Assign at least one role before elevating @${selectedBasicUser.username}.`
            : ""
        }
        footer={
          <>
            <button
              className="button button-secondary"
              onClick={() => {
                setSelectedBasicUserId(null);
                setElevationFormState(emptyElevationForm);
              }}
              type="button"
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              disabled={elevateBasicUserMutation.isPending}
              form="basic-user-elevation-form"
              type="submit"
            >
              {elevateBasicUserMutation.isPending ? "Elevating..." : "Elevate to staff"}
            </button>
          </>
        }
        isOpen={Boolean(selectedBasicUser)}
        onClose={() => {
          setSelectedBasicUserId(null);
          setElevationFormState(emptyElevationForm);
        }}
        size="medium"
        title="Elevate basic user"
      >
        {selectedBasicUser ? (
          <form
            className="page-stack"
            id="basic-user-elevation-form"
            onSubmit={(event) => {
              event.preventDefault();
              elevateBasicUserMutation.mutate(toElevationPayload(elevationFormState));
            }}
          >
            <div className="detail-grid detail-grid-2">
              <article className="detail-item">
                <dt>Username</dt>
                <dd>@{selectedBasicUser.username}</dd>
              </article>
              <article className="detail-item">
                <dt>Email</dt>
                <dd>{selectedBasicUser.email || "-"}</dd>
              </article>
            </div>

            <label className="checkbox-field">
              <input
                checked={elevationFormState.is_active}
                onChange={(event) =>
                  setElevationFormState((current) => ({ ...current, is_active: event.target.checked }))
                }
                type="checkbox"
              />
              <span>Keep user active during elevation</span>
            </label>

            <div className="form-grid">
              <span className="field-label">Assign roles</span>
              <div className="tag-list">
                {sortedRoles.map((role) => (
                  <label className="checkbox-field checkbox-field-inline" key={`elevate-${role.id}`}>
                    <input
                      checked={elevationFormState.role_ids.includes(role.id)}
                      onChange={() =>
                        setElevationFormState((current) => ({
                          ...current,
                          role_ids: toggleRoleIds(current.role_ids, role.id),
                        }))
                      }
                      type="checkbox"
                    />
                    <span>{role.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <ErrorAlert
              error={elevateBasicUserMutation.error}
              fallbackMessage="This user could not be elevated."
            />
          </form>
        ) : null}
      </FormModalShell>
    </div>
  );
}
