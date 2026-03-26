import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { BlockedFeatureCard } from "../components/BlockedFeatureCard";
import { EmptyState } from "../components/EmptyState";
import { EntityTable } from "../components/EntityTable";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { usersApi } from "../domains/users/api";
import { formatDateTime } from "../utils/formatters";

type StaffStatusFilter = "all" | "active" | "inactive";

export function SettingsStaffPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>("all");
  const deferredSearch = useDeferredValue(search);

  const staffUsersQuery = useQuery({
    queryKey: ["settings", "staff-users"],
    queryFn: () => usersApi.listStaffUsers(),
  });

  const staffUsers = useMemo(() => {
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

  if (staffUsersQuery.isLoading) {
    return (
      <LoadingState
        title="Loading staff users"
        description="Fetching the read-only staff directory from the backend settings slice."
      />
    );
  }

  if (staffUsersQuery.error) {
    return (
      <ErrorState
        title="Staff users could not be loaded"
        error={staffUsersQuery.error}
        onRetry={() => {
          void staffUsersQuery.refetch();
        }}
      />
    );
  }

  const hasFilters = Boolean(search.trim()) || statusFilter !== "all";
  const allStaffUsers = staffUsersQuery.data ?? [];
  const activeCount = allStaffUsers.filter((user) => user.is_active).length;
  const inactiveCount = allStaffUsers.length - activeCount;
  const superuserCount = allStaffUsers.filter((user) => user.is_superuser).length;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Settings / staff users"
        title="Staff users"
        description="API-backed read-only staff directory from the users app. Staff-user mutations are intentionally outside the current frontend scope."
        actions={
          <div className="inline-actions">
            <Link className="button button-secondary" to="/settings/roles">
              View roles
            </Link>
            <button className="button button-ghost" type="button" disabled>
              Invite user (blocked)
            </button>
          </div>
        }
        meta={
          <>
            <StatusBadge label="Read-only settings surface" tone="info" />
            <StatusBadge label="API-backed" tone="success" />
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
        title="Invite and access-control workflows"
        description="Invite, user creation, and role mutation actions are still intentionally blocked in the current backend settings slice."
        reason="User creation, role assignment, and access mutation should remain in Django admin/bootstrap workflows until dedicated mutation APIs are implemented."
      />

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

      {staffUsers.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No staff users matched the current filters" : "No staff users are available"}
          description={
            hasFilters
              ? "Try a broader search or clear the current status filter."
              : "Create staff users through Django admin or backend bootstrap flows, then return to this read-only directory."
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
            ) : null
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
                header: "Last login",
                cell: (user) => formatDateTime(user.last_login),
              },
            ]}
            getRowKey={(user) => user.id}
            rows={staffUsers}
          />
        </section>
      )}
    </div>
  );
}
