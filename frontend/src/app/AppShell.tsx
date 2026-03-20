import { useMutation } from "@tanstack/react-query";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

function navClassName({ isActive }: { isActive: boolean }) {
  return isActive ? "app-nav-link app-nav-link-active" : "app-nav-link";
}

export function AppShell() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      navigate("/login", { replace: true });
    },
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-eyebrow">The Haven</p>
          <h1>Operations Console</h1>
        </div>
        <div className="app-header-actions">
          <div className="session-summary">
            <span className="session-label">Signed in as</span>
            <strong>{user?.first_name || user?.username}</strong>
          </div>
          <button
            className="button button-secondary"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
          >
            {logoutMutation.isPending ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar">
          <nav className="app-nav">
            <NavLink className={navClassName} to="/dashboard">
              Dashboard
            </NavLink>
            <NavLink className={navClassName} to="/members">
              Members
            </NavLink>
          </nav>
        </aside>

        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
