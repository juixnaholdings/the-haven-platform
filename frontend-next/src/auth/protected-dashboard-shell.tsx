"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { LoadingState } from "@/components/LoadingState";

import { useSession } from "./use-session";

interface ProtectedDashboardShellProps {
  children: React.ReactNode;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", activePrefix: "/dashboard", available: true },
  { label: "Members", href: "/members", activePrefix: "/members", available: true },
  { label: "Households", href: "/households", activePrefix: "/households", available: true },
  { label: "Ministries", href: "/groups", activePrefix: "/groups", available: true },
  { label: "Events", href: "/events", activePrefix: "/events", available: true },
  { label: "Attendance", href: "/attendance", activePrefix: "/attendance", available: true },
  { label: "Finance", href: "/finance", activePrefix: "/finance", available: true },
  { label: "Reports", href: "/reports", activePrefix: "/reports", available: true },
  { label: "Settings", href: "", activePrefix: "/settings", available: false },
];

function getDisplayName(user: NonNullable<ReturnType<typeof useSession>["user"]>) {
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  return fullName || user.username;
}

export function ProtectedDashboardShell({
  children,
}: ProtectedDashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isBootstrapping, status, user, logout } = useSession();

  useEffect(() => {
    if (status !== "unauthenticated") {
      return;
    }

    const query =
      typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
    const nextPath = query ? `${pathname}?${query}` : pathname;
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }, [pathname, router, status]);

  if (isBootstrapping) {
    return <LoadingState title="Restoring your session..." />;
  }

  if (!isAuthenticated || !user) {
    return <LoadingState title="Redirecting to sign in..." />;
  }

  const primaryRole = user.role_names?.[0] ?? "Authenticated staff";
  const displayName = getDisplayName(user);
  const initials = displayName.slice(0, 2).toUpperCase();

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
            <p className="muted-text">
              Refined clerical workspace for internal church operations.
            </p>
          </div>
        </div>

        <nav className="app-nav" aria-label="Primary">
          {navItems.map((item) => {
            const isActive =
              item.activePrefix === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.activePrefix);

            const className = isActive
              ? "app-nav-link app-nav-link-active"
              : "app-nav-link";

            if (item.available) {
              return (
                <Link className={className} href={item.href} key={item.label}>
                  {item.label}
                </Link>
              );
            }

            return (
              <span className="app-nav-link app-nav-link-placeholder" key={item.label}>
                {item.label}
              </span>
            );
          })}
        </nav>

        <div className="app-sidebar-footer">
          <div className="session-card">
            <span className="session-label">Signed in as</span>
            <strong>{displayName}</strong>
            <span className="session-role">{primaryRole}</span>
          </div>
          <button
            className="button button-secondary app-signout-button"
            onClick={() => {
              void logout().then(() => {
                router.replace("/login");
              });
            }}
            type="button"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="app-stage">
        <header className="app-header">
          <div className="app-header-copy">
            <p className="app-eyebrow">Protected internal workspace</p>
            <h2>Daily operations</h2>
            <p className="muted-text">
              Member care, service administration, attendance, and reporting in one
              quiet workspace.
            </p>
          </div>
          <div className="app-header-actions">
            <span className="status-badge status-badge-info">Authenticated session</span>
            <span className="status-badge status-badge-muted">{primaryRole}</span>
          </div>
        </header>

        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
