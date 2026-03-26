import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { EmptyState } from "../components/EmptyState";
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

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Settings / roles"
        title="Roles"
        description="This is a safe read-only summary of the backend role foundation. Role assignment and permission changes still live in bootstrap commands and Django admin."
        actions={
          <Link className="button button-secondary" to="/settings/staff">
            View staff users
          </Link>
        }
        meta={<StatusBadge label="Read-only settings surface" tone="info" />}
      />

      <section className="metrics-grid">
        <StatCard label="Roles" value={roles.length} tone="accent" />
        <StatCard label="Assigned users" value={totalAssignedUsers} />
        <StatCard label="Role permissions" value={totalPermissions} />
      </section>

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
    </div>
  );
}
