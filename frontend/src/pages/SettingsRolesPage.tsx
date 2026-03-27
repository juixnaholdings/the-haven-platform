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

export function SettingsRolesPage() {
  const rolesQuery = useQuery({
    queryKey: ["settings", "roles"],
    queryFn: () => usersApi.listRoleSummaries(),
  });

  if (rolesQuery.isLoading) {
    return (
      <LoadingState
        title="Loading roles"
        description="Fetching the current read-only role and permission summary from the backend."
      />
    );
  }

  if (rolesQuery.error) {
    return (
      <ErrorState
        title="Roles could not be loaded"
        error={rolesQuery.error}
        onRetry={() => {
          void rolesQuery.refetch();
        }}
      />
    );
  }

  const roles = rolesQuery.data ?? [];
  const totalAssignedUsers = roles.reduce((sum, role) => sum + role.user_count, 0);
  const totalPermissions = roles.reduce((sum, role) => sum + role.permissions.length, 0);
  const permissionGroups = Object.entries(
    roles.reduce<Record<string, Set<string>>>((groups, role) => {
      role.permissions.forEach((permission) => {
        if (!groups[permission.app_label]) {
          groups[permission.app_label] = new Set();
        }
        groups[permission.app_label].add(permission.permission_code);
      });
      return groups;
    }, {}),
  )
    .map(([appLabel, permissions]) => ({
      appLabel,
      permissionCount: permissions.size,
    }))
    .sort((left, right) => right.permissionCount - left.permissionCount);

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Settings / roles"
        title="Roles"
        description="Role definitions and permission scopes are visible here, while assignment workflows are managed from the staff-user settings page."
        actions={
          <Link className="button button-secondary" to="/settings/staff">
            Manage staff users
          </Link>
        }
        meta={
          <>
            <StatusBadge label="Role definitions are seeded/static" tone="info" />
            <StatusBadge label="API-backed" tone="success" />
          </>
        }
      />

      <section className="metrics-grid">
        <StatCard label="Roles" value={roles.length} tone="accent" />
        <StatCard label="Assigned users" value={totalAssignedUsers} />
        <StatCard label="Role permissions" value={totalPermissions} />
        <StatCard label="Permission groups" value={permissionGroups.length} />
      </section>

      <BlockedFeatureCard
        title="Role-definition mutation workflows"
        description="Renaming roles, editing role permissions, and governance/audit workflows are intentionally not exposed in product UI."
        reason="Role definitions remain bootstrap-governed. Use setup commands and Django admin for role-definition changes."
      />

      {roles.length === 0 ? (
        <EmptyState
          title="No role summaries are available"
          description="Run the baseline role setup command or inspect the Django admin groups view to initialize role data."
        />
      ) : (
        <div className="panel-grid">
          {roles.map((role) => (
            <section className="panel" key={role.id}>
              <div className="panel-header">
                <div>
                  <h3>{role.name}</h3>
                  <p className="muted-text">Current assigned users and permission codes for this role.</p>
                </div>
                <StatusBadge
                  label={`${role.user_count} assigned user${role.user_count === 1 ? "" : "s"}`}
                  tone="info"
                />
              </div>

              {role.permissions.length === 0 ? (
                <EmptyState
                  title="No permissions assigned"
                  description="This role currently has no model permissions attached."
                />
              ) : (
                <div className="tag-list">
                  {role.permissions.map((permission) => (
                    <span className="tag" key={permission.id}>
                      {permission.permission_code}
                    </span>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Permission groups</h3>
            <p className="muted-text">Grouped by Django app label from the role permission summary payload.</p>
          </div>
        </div>
        {permissionGroups.length === 0 ? (
          <EmptyState
            title="No permission groups available"
            description="Assign role permissions to populate grouped access visibility."
          />
        ) : (
          <EntityTable
            columns={[
              {
                header: "Group",
                cell: (group) => group.appLabel,
              },
              {
                header: "Permissions",
                cell: (group) => group.permissionCount,
              },
            ]}
            getRowKey={(group) => group.appLabel}
            rows={permissionGroups}
          />
        )}
      </section>
    </div>
  );
}
