import { useMutation } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

function navClassName({ isActive }: { isActive: boolean }) {
  return isActive ? "app-nav-link app-nav-link-active" : "app-nav-link";
}

export function AppShell() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const primaryRole = user?.role_names?.[0] ?? "Authenticated staff";
  const displayName = user?.first_name || user?.username || "Staff user";
  const initials = displayName.slice(0, 2).toUpperCase();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      navigate("/login", { replace: true });
    },
  });

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="app-sidebar-brand">
          <div className="app-brand-mark" aria-hidden="true">
            {initials}
          </div>
          <div className="app-sidebar-brand-copy">
            <p className="app-eyebrow">The Haven</p>
            <h1>Operations Console</h1>
            <p className="muted-text">Refined clerical workspace for internal church operations.</p>
          </div>
        </div>

        <nav className="app-nav">
          <NavLink className={navClassName} to="/dashboard">
            Dashboard
          </NavLink>
          <NavLink className={navClassName} to="/members">
            Members
          </NavLink>
          <NavLink className={navClassName} to="/households">
            Households
          </NavLink>
          <NavLink className={navClassName} to="/groups">
            Ministries
          </NavLink>
          <NavLink className={navClassName} to="/events">
            Events
          </NavLink>
          <NavLink className={navClassName} to="/attendance">
            Attendance
          </NavLink>
          <NavLink className={navClassName} to="/finance">
            Finance
          </NavLink>
          <NavLink className={navClassName} to="/reports">
            Reports
          </NavLink>
          <NavLink className={navClassName} to="/settings/roles">
            Settings
          </NavLink>
        </nav>

        <div className="app-sidebar-footer">
          <div className="session-card">
            <span className="session-label">Signed in as</span>
            <strong>{displayName}</strong>
            <span className="session-role">{primaryRole}</span>
          </div>
          <button
            className="button button-secondary app-signout-button"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            type="button"
          >
            {logoutMutation.isPending ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="app-stage">
        <header className="app-header">
          <div className="app-header-copy">
            <p className="app-eyebrow">Protected internal workspace</p>
            <h2>Daily operations</h2>
            <p className="muted-text">
              Member care, service administration, attendance, and reporting in one quiet workspace.
            </p>
          </div>
          <div className="app-header-actions">
            <span className="status-badge status-badge-info">Authenticated session</span>
            <span className="status-badge status-badge-muted">{primaryRole}</span>
          </div>
        </header>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
