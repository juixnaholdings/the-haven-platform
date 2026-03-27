"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import {
  BlockedFeatureCard,
  EmptyState,
  EntityTable,
  ErrorState,
  LoadingState,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components";
import { usersApi } from "@/domains/users/api";

export function SettingsRolesPageScreen() {
  const rolesQuery = useQuery({
    queryKey: ["settings", "roles"],
    queryFn: () => usersApi.listRoleSummaries(),
  });

  if (rolesQuery.isLoading) {
    return (
      <LoadingState
        description="Fetching the current read-only role and permission summary from the backend."
        title="Loading roles"
      />
    );
  }

  if (rolesQuery.error) {
    return (
      <ErrorState
        error={rolesQuery.error}
        onRetry={() => {
          void rolesQuery.refetch();
        }}
        title="Roles could not be loaded"
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
        actions={
          <Link className="button button-secondary" href="/settings/staff">
            Manage staff users
          </Link>
        }
        description="Role definitions and permission scopes are visible here, while assignment workflows are managed from the staff-user settings page."
        eyebrow="Settings / roles"
        meta={
          <>
            <StatusBadge label="Role definitions are seeded/static" tone="info" />
            <StatusBadge label="API-backed" tone="success" />
          </>
        }
        title="Roles"
      />

      <section className="metrics-grid">
        <StatCard label="Roles" tone="accent" value={roles.length} />
        <StatCard label="Assigned users" value={totalAssignedUsers} />
        <StatCard label="Role permissions" value={totalPermissions} />
        <StatCard label="Permission groups" value={permissionGroups.length} />
      </section>

      <BlockedFeatureCard
        description="Renaming roles, editing role permissions, and governance/audit workflows are intentionally not exposed in product UI."
        reason="Role definitions remain bootstrap-governed. Use setup commands and Django admin for role-definition changes."
        title="Role-definition mutation workflows"
      />

      {roles.length === 0 ? (
        <EmptyState
          description="Run the baseline role setup command or inspect the Django admin groups view to initialize role data."
          title="No role summaries are available"
        />
      ) : (
        <div className="panel-grid">
          {roles.map((role) => (
            <section className="panel" key={role.id}>
              <div className="panel-header">
                <div>
                  <h3>{role.name}</h3>
                  <p className="muted-text">
                    Current assigned users and permission codes for this role.
                  </p>
                </div>
                <StatusBadge
                  label={`${role.user_count} assigned user${role.user_count === 1 ? "" : "s"}`}
                  tone="info"
                />
              </div>

              {role.permissions.length === 0 ? (
                <EmptyState
                  description="This role currently has no model permissions attached."
                  title="No permissions assigned"
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
            <p className="muted-text">
              Grouped by Django app label from the role permission summary payload.
            </p>
          </div>
        </div>
        {permissionGroups.length === 0 ? (
          <EmptyState
            description="Assign role permissions to populate grouped access visibility."
            title="No permission groups available"
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
