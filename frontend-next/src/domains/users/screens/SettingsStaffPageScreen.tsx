"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";

import { queryClient } from "@/api/queryClient";
import {
  BlockedFeatureCard,
  EmptyState,
  EntityTable,
  ErrorAlert,
  ErrorState,
  FilterActionStrip,
  FormSection,
  LoadingState,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components";
import { usersApi } from "@/domains/users/api";
import type {
  RoleSummary,
  StaffUserCreatePayload,
  StaffUserListItem,
  StaffUserUpdatePayload,
} from "@/domains/types";
import { formatDateTime } from "@/lib/formatters";

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

const EMPTY_STAFF_USERS: StaffUserListItem[] = [];

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

export function SettingsStaffPageScreen() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>("all");
  const [selectedStaffUserId, setSelectedStaffUserId] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormState, setCreateFormState] = useState<StaffCreateFormState>(emptyCreateForm);
  const [updateFormOverrides, setUpdateFormOverrides] = useState<Partial<StaffUpdateFormState>>(
    {},
  );
  const deferredSearch = useDeferredValue(search);

  const staffUsersQuery = useQuery({
    queryKey: ["settings", "staff-users"],
    queryFn: () => usersApi.listStaffUsers(),
  });

  const rolesQuery = useQuery({
    queryKey: ["settings", "roles"],
    queryFn: () => usersApi.listRoleSummaries(),
  });

  const allStaffUsers = staffUsersQuery.data ?? EMPTY_STAFF_USERS;
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

  const sortedRoles = useMemo(() => sortRoles(rolesQuery.data ?? []), [rolesQuery.data]);

  const filteredStaffUsers = allStaffUsers.filter((user) => {
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

  if (staffUsersQuery.isLoading || rolesQuery.isLoading) {
    return (
      <LoadingState
        description="Fetching staff users and role definitions from the settings endpoints."
        title="Loading staff settings"
      />
    );
  }

  if (staffUsersQuery.error || rolesQuery.error) {
    return (
      <ErrorState
        error={staffUsersQuery.error ?? rolesQuery.error ?? new Error("Unknown settings error.")}
        onRetry={() => {
          void staffUsersQuery.refetch();
          void rolesQuery.refetch();
        }}
        title="Staff settings could not be loaded"
      />
    );
  }

  const hasFilters = Boolean(search.trim()) || statusFilter !== "all";
  const activeCount = allStaffUsers.filter((user) => user.is_active).length;
  const inactiveCount = allStaffUsers.length - activeCount;
  const superuserCount = allStaffUsers.filter((user) => user.is_superuser).length;

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <div className="inline-actions">
            <Link className="button button-secondary" href="/settings/roles">
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
        description="Manage staff-user profiles, active status, and role assignment through the users settings APIs. Role definitions remain controlled by seeded groups."
        eyebrow="Settings / staff users"
        meta={
          <>
            <StatusBadge label="Read-write staff management" tone="success" />
            <StatusBadge label="Backend-enforced access control" tone="info" />
          </>
        }
        title="Staff users"
      />

      <section className="metrics-grid">
        <StatCard label="Staff users" tone="accent" value={allStaffUsers.length} />
        <StatCard label="Active now" value={activeCount} />
        <StatCard label="Inactive" value={inactiveCount} />
        <StatCard label="Superusers" value={superuserCount} />
      </section>

      <BlockedFeatureCard
        description="Current settings APIs support controlled create/update and role assignment, but not email-invite onboarding flows or a dedicated settings audit timeline."
        reason="Use the existing create-user flow for now. Full invite lifecycle and audit surfaces remain outside this release slice."
        title="Invite, onboarding, and audit workflows"
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
            description="Create a staff account and assign baseline roles. Passwords are set directly in this controlled admin workflow."
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

      <FilterActionStrip
        actions={
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
          ) : null
        }
        filters={
          <label className="field">
            <span>Status</span>
            <select
              onChange={(event) => setStatusFilter(event.target.value as StaffStatusFilter)}
              value={statusFilter}
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, username, email, or role"
              value={search}
            />
          </label>
        }
      />

      {filteredStaffUsers.length === 0 ? (
        <EmptyState
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
          description={
            hasFilters
              ? "Try a broader search or clear the current status filter."
              : "Create a staff user to initialize settings administration workflows."
          }
          title={hasFilters ? "No staff users matched the current filters" : "No staff users are available"}
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
                    <StatusBadge
                      label={user.is_active ? "Active" : "Inactive"}
                      tone={user.is_active ? "success" : "muted"}
                    />
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
            <button
              className="button button-secondary"
              onClick={() => setUpdateFormOverrides({})}
              type="button"
            >
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
    </div>
  );
}
