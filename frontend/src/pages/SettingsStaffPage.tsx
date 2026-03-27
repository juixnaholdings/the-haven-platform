import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { queryClient } from "../api/queryClient";
import { BlockedFeatureCard } from "../components/BlockedFeatureCard";
import { EmptyState } from "../components/EmptyState";
import { EntityTable } from "../components/EntityTable";
import { ErrorAlert } from "../components/ErrorAlert";
import { ErrorState } from "../components/ErrorState";
import { FormSection } from "../components/FormSection";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { usersApi } from "../domains/users/api";
import type {
  RoleSummary,
  StaffUserCreatePayload,
  StaffUserListItem,
  StaffUserUpdatePayload,
} from "../domains/types";
import { formatDateTime } from "../utils/formatters";

type StaffStatusFilter = "all" | "active" | "inactive";

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

function roleIdSetFromUser(user: StaffUserListItem): number[] {
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

export function SettingsStaffPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>("all");
  const [selectedStaffUserId, setSelectedStaffUserId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormState, setCreateFormState] = useState<StaffCreateFormState>(emptyCreateForm);
  const [updateFormState, setUpdateFormState] = useState<StaffUpdateFormState>(emptyUpdateForm);
  const deferredSearch = useDeferredValue(search);

  const staffUsersQuery = useQuery({
    queryKey: ["settings", "staff-users"],
    queryFn: () => usersApi.listStaffUsers(),
  });

  const rolesQuery = useQuery({
    queryKey: ["settings", "roles"],
    queryFn: () => usersApi.listRoleSummaries(),
  });

  const createStaffUserMutation = useMutation({
    mutationFn: (payload: StaffUserCreatePayload) => usersApi.createStaffUser(payload),
    onSuccess: async (createdStaffUser) => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "staff-users"] });
      await queryClient.invalidateQueries({ queryKey: ["settings", "roles"] });
      setCreateFormState(emptyCreateForm);
      setShowCreateForm(false);
      setSelectedStaffUserId(createdStaffUser.id);
    },
  });

  const updateStaffUserMutation = useMutation({
    mutationFn: (payload: StaffUserUpdatePayload) => {
      if (!selectedStaffUserId) {
        throw new Error("No staff user selected.");
      }
      return usersApi.updateStaffUser(selectedStaffUserId, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["settings", "staff-users"] });
      await queryClient.invalidateQueries({ queryKey: ["settings", "roles"] });
    },
  });

  const sortedRoles = useMemo(() => sortRoles(rolesQuery.data ?? []), [rolesQuery.data]);

  const filteredStaffUsers = useMemo(() => {
    const users = staffUsersQuery.data ?? [];
    return users.filter((user) => {
      const matchesSearch = deferredSearch
        ? [user.full_name, user.username, user.email, ...user.role_names]
            .join(" ")
            .toLowerCase()
            .includes(deferredSearch.toLowerCase())
        : true;

      const matchesStatus =
        statusFilter === "all" ? true : statusFilter === "active" ? user.is_active : !user.is_active;

      return matchesSearch && matchesStatus;
    });
  }, [deferredSearch, staffUsersQuery.data, statusFilter]);

  useEffect(() => {
    if (!staffUsersQuery.data || staffUsersQuery.data.length === 0) {
      setSelectedStaffUserId(null);
      setUpdateFormState(emptyUpdateForm);
      return;
    }

    const selectedUserStillExists = selectedStaffUserId
      ? staffUsersQuery.data.some((user) => user.id === selectedStaffUserId)
      : false;
    const nextSelectedUserId = selectedUserStillExists
      ? selectedStaffUserId
      : staffUsersQuery.data[0].id;

    setSelectedStaffUserId(nextSelectedUserId);
  }, [selectedStaffUserId, staffUsersQuery.data]);

  const selectedStaffUser = useMemo(
    () =>
      (staffUsersQuery.data ?? []).find((user) => user.id === selectedStaffUserId) ?? null,
    [selectedStaffUserId, staffUsersQuery.data],
  );

  useEffect(() => {
    if (!selectedStaffUser) {
      setUpdateFormState(emptyUpdateForm);
      return;
    }

    setUpdateFormState({
      email: selectedStaffUser.email ?? "",
      first_name: selectedStaffUser.first_name ?? "",
      last_name: selectedStaffUser.last_name ?? "",
      is_active: selectedStaffUser.is_active,
      role_ids: roleIdSetFromUser(selectedStaffUser),
    });
  }, [selectedStaffUser]);

  if (staffUsersQuery.isLoading || rolesQuery.isLoading) {
    return (
      <LoadingState
        title="Loading staff settings"
        description="Fetching staff users and role definitions from the settings endpoints."
      />
    );
  }

  if (staffUsersQuery.error || rolesQuery.error) {
    return (
      <ErrorState
        title="Staff settings could not be loaded"
        error={staffUsersQuery.error ?? rolesQuery.error ?? new Error("Unknown settings error.")}
        onRetry={() => {
          void staffUsersQuery.refetch();
          void rolesQuery.refetch();
        }}
      />
    );
  }

  const allStaffUsers = staffUsersQuery.data ?? [];
  const hasFilters = Boolean(search.trim()) || statusFilter !== "all";
  const activeCount = allStaffUsers.filter((user) => user.is_active).length;
  const inactiveCount = allStaffUsers.length - activeCount;
  const superuserCount = allStaffUsers.filter((user) => user.is_superuser).length;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Settings / staff users"
        title="Staff users"
        description="Manage staff-user profiles, active status, and role assignment through the users settings APIs. Role definitions remain controlled by seeded groups."
        actions={
          <div className="inline-actions">
            <Link className="button button-secondary" to="/settings/roles">
              View roles
            </Link>
            <button
              className={showCreateForm ? "button button-secondary" : "button button-primary"}
              onClick={() => setShowCreateForm((current) => !current)}
              type="button"
            >
              {showCreateForm ? "Close form" : "Add staff user"}
            </button>
          </div>
        }
        meta={
          <>
            <StatusBadge label="Read-write staff management" tone="success" />
            <StatusBadge label="Backend-enforced access control" tone="info" />
          </>
        }
      />

      <section className="metrics-grid">
        <StatCard label="Staff users" value={allStaffUsers.length} tone="accent" />
        <StatCard label="Active now" value={activeCount} />
        <StatCard label="Inactive" value={inactiveCount} />
        <StatCard label="Superusers" value={superuserCount} />
      </section>

      <BlockedFeatureCard
        title="Invite, onboarding, and audit workflows"
        description="Current settings APIs support controlled create/update and role assignment, but not email-invite onboarding flows or a dedicated settings audit timeline."
        reason="Use the existing create-user flow for now. Full invite lifecycle and audit surfaces remain outside this release slice."
        tone="info"
      />

      {showCreateForm ? (
        <form
          className="page-stack"
          onSubmit={(event) => {
            event.preventDefault();
            createStaffUserMutation.mutate(toCreatePayload(createFormState));
          }}
        >
          <FormSection
            title="Add staff user"
            description="Create a staff account and assign baseline roles. Passwords are set directly in this controlled admin workflow."
          >
            <div className="form-grid form-grid-2">
              <label className="field">
                <span>Username</span>
                <input
                  required
                  value={createFormState.username}
                  onChange={(event) =>
                    setCreateFormState((current) => ({ ...current, username: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  required
                  type="email"
                  value={createFormState.email}
                  onChange={(event) =>
                    setCreateFormState((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>First name</span>
                <input
                  value={createFormState.first_name}
                  onChange={(event) =>
                    setCreateFormState((current) => ({ ...current, first_name: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>Last name</span>
                <input
                  value={createFormState.last_name}
                  onChange={(event) =>
                    setCreateFormState((current) => ({ ...current, last_name: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>Temporary password</span>
                <input
                  required
                  minLength={8}
                  type="password"
                  value={createFormState.password}
                  onChange={(event) =>
                    setCreateFormState((current) => ({ ...current, password: event.target.value }))
                  }
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
        <div className="filters-grid filters-grid-2">
          <label className="field">
            <span>Search staff users</span>
            <input
              placeholder="Search by name, username, email, or role"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StaffStatusFilter)}
            >
              <option value="all">All staff users</option>
              <option value="active">Active users</option>
              <option value="inactive">Inactive users</option>
            </select>
          </label>
        </div>
      </section>

      {filteredStaffUsers.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No staff users matched the current filters" : "No staff users are available"}
          description={
            hasFilters
              ? "Try a broader search or clear the current status filter."
              : "Create a staff user to initialize settings administration workflows."
          }
          action={
            hasFilters ? (
              <button
                className="button button-secondary"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                }}
                type="button"
              >
                Clear filters
              </button>
            ) : (
              <button className="button button-primary" onClick={() => setShowCreateForm(true)} type="button">
                Add staff user
              </button>
            )
          }
        />
      ) : (
        <section className="panel">
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
              {
                header: "Email",
                cell: (user) => user.email || "—",
              },
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
                      selectedStaffUserId === user.id
                        ? "button button-secondary button-compact"
                        : "button button-ghost button-compact"
                    }
                    onClick={() => setSelectedStaffUserId(user.id)}
                    type="button"
                  >
                    {selectedStaffUserId === user.id ? "Editing" : "Manage"}
                  </button>
                ),
              },
              {
                header: "Last login",
                cell: (user) => formatDateTime(user.last_login),
              },
            ]}
            getRowKey={(user) => user.id}
            rows={filteredStaffUsers}
          />
        </section>
      )}

      {selectedStaffUser ? (
        <form
          className="page-stack"
          onSubmit={(event) => {
            event.preventDefault();
            updateStaffUserMutation.mutate(toUpdatePayload(updateFormState));
          }}
        >
          <FormSection
            title={`Edit staff user: ${selectedStaffUser.full_name}`}
            description="Update identity fields, active status, and assigned roles for this staff account."
          >
            <div className="form-grid form-grid-2">
              <label className="field">
                <span>Username</span>
                <input disabled value={selectedStaffUser.username} />
              </label>

              <label className="field">
                <span>Email</span>
                <input
                  required
                  type="email"
                  value={updateFormState.email}
                  onChange={(event) =>
                    setUpdateFormState((current) => ({ ...current, email: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>First name</span>
                <input
                  value={updateFormState.first_name}
                  onChange={(event) =>
                    setUpdateFormState((current) => ({ ...current, first_name: event.target.value }))
                  }
                />
              </label>

              <label className="field">
                <span>Last name</span>
                <input
                  value={updateFormState.last_name}
                  onChange={(event) =>
                    setUpdateFormState((current) => ({ ...current, last_name: event.target.value }))
                  }
                />
              </label>

              <label className="checkbox-field checkbox-field-inline">
                <input
                  checked={updateFormState.is_active}
                  onChange={(event) =>
                    setUpdateFormState((current) => ({ ...current, is_active: event.target.checked }))
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
                      checked={updateFormState.role_ids.includes(role.id)}
                      onChange={() =>
                        setUpdateFormState((current) => ({
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
            <button
              className="button button-secondary"
              onClick={() => {
                if (!selectedStaffUser) {
                  setUpdateFormState(emptyUpdateForm);
                  return;
                }
                setUpdateFormState({
                  email: selectedStaffUser.email ?? "",
                  first_name: selectedStaffUser.first_name ?? "",
                  last_name: selectedStaffUser.last_name ?? "",
                  is_active: selectedStaffUser.is_active,
                  role_ids: roleIdSetFromUser(selectedStaffUser),
                });
              }}
              type="button"
            >
              Reset changes
            </button>
          </div>
        </form>
      ) : (
        <EmptyState
          title="No staff user selected"
          description="Choose a staff record above to edit access and role assignments."
        />
      )}
    </div>
  );
}
