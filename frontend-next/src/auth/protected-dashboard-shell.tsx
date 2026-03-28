"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LoadingState } from "@/components/LoadingState";

import { useSession } from "./use-session";

interface ProtectedDashboardShellProps {
  children: React.ReactNode;
}

interface NavItem {
  activePrefix: string;
  href: string;
  label: string;
  shortLabel: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", activePrefix: "/dashboard", shortLabel: "DB" },
  { label: "Members", href: "/members", activePrefix: "/members", shortLabel: "MB" },
  { label: "Households", href: "/households", activePrefix: "/households", shortLabel: "HH" },
  { label: "Ministries", href: "/groups", activePrefix: "/groups", shortLabel: "GR" },
  { label: "Events", href: "/events", activePrefix: "/events", shortLabel: "EV" },
  { label: "Attendance", href: "/attendance", activePrefix: "/attendance", shortLabel: "AT" },
  { label: "Finance", href: "/finance", activePrefix: "/finance", shortLabel: "FI" },
  { label: "Reports", href: "/reports", activePrefix: "/reports", shortLabel: "RP" },
];

const mobileMediaQuery = "(max-width: 1024px)";

function getDisplayName(user: NonNullable<ReturnType<typeof useSession>["user"]>) {
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  return fullName || user.username;
}

function AppSettingsGearIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M10.6 2.1a1 1 0 0 1 1.8 0l.64 1.38a1 1 0 0 0 .86.57l1.52.1a1 1 0 0 1 .88 1.37l-.56 1.42a1 1 0 0 0 .2 1.01l1.03 1.12a1 1 0 0 1 0 1.36l-1.03 1.12a1 1 0 0 0-.2 1.01l.56 1.42a1 1 0 0 1-.88 1.37l-1.52.1a1 1 0 0 0-.86.57l-.64 1.38a1 1 0 0 1-1.8 0l-.64-1.38a1 1 0 0 0-.86-.57l-1.52-.1a1 1 0 0 1-.88-1.37l.56-1.42a1 1 0 0 0-.2-1.01l-1.03-1.12a1 1 0 0 1 0-1.36l1.03-1.12a1 1 0 0 0 .2-1.01l-.56-1.42a1 1 0 0 1 .88-1.37l1.52-.1a1 1 0 0 0 .86-.57l.64-1.38Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" fill="none" r="2.75" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16M4 12h16M4 17h12" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function ProtectedDashboardShell({
  children,
}: ProtectedDashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isBootstrapping, status, user, logout } = useSession();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    if (status !== "unauthenticated") {
      return;
    }

    const query =
      typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
    const nextPath = query ? `${pathname}?${query}` : pathname;
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
  }, [pathname, router, status]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(mobileMediaQuery);
    const handleChange = () => {
      const isMobile = mediaQuery.matches;
      setIsMobileViewport(isMobile);

      if (!isMobile) {
        setIsMobileNavOpen(false);
      }
    };

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  if (isBootstrapping) {
    return <LoadingState title="Restoring your session..." />;
  }

  if (!isAuthenticated || !user) {
    return <LoadingState title="Redirecting to sign in..." />;
  }

  const primaryRole = user.role_names?.[0] ?? "Authenticated staff";
  const displayName = getDisplayName(user);
  const initials = displayName.slice(0, 2).toUpperCase();
  const hasAuditAccess = Boolean(
    user.is_superuser ||
      user.role_names?.some((roleName) => roleName === "Super Admin" || roleName === "Church Admin"),
  );
  const visibleNavItems = hasAuditAccess
    ? [...navItems, { label: "Audit", href: "/audit", activePrefix: "/audit", shortLabel: "AU" }]
    : navItems;
  const shellClassName = [
    "app-shell",
    isSidebarCollapsed && !isMobileViewport ? "app-shell-collapsed" : "",
    isMobileViewport ? "app-shell-mobile" : "",
    isMobileNavOpen ? "app-shell-mobile-open" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const navToggleLabel = (() => {
    if (isMobileViewport) {
      return isMobileNavOpen ? "Close navigation menu" : "Open navigation menu";
    }

    return isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar";
  })();

  return (
    <div className={shellClassName}>
      {isMobileViewport && isMobileNavOpen ? (
        <button
          aria-label="Close navigation menu"
          className="app-sidebar-backdrop"
          onClick={() => setIsMobileNavOpen(false)}
          type="button"
        />
      ) : null}

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
          {visibleNavItems.map((item) => {
            const isActive =
              item.activePrefix === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.activePrefix);

            const className = isActive
              ? "app-nav-link app-nav-link-active"
              : "app-nav-link";

            return (
              <Link
                className={className}
                href={item.href}
                key={item.label}
                onClick={() => {
                  if (isMobileViewport) {
                    setIsMobileNavOpen(false);
                  }
                }}
              >
                <span aria-hidden="true" className="app-nav-icon">
                  {item.shortLabel}
                </span>
                <span className="app-nav-label">{item.label}</span>
              </Link>
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
          <div className="app-header-left">
            <button
              aria-expanded={isMobileViewport ? isMobileNavOpen : !isSidebarCollapsed}
              aria-label={navToggleLabel}
              className="button button-ghost app-shell-toggle"
              onClick={() => {
                if (isMobileViewport) {
                  setIsMobileNavOpen((current) => !current);
                  return;
                }

                setIsSidebarCollapsed((current) => !current);
              }}
              type="button"
            >
              <HamburgerIcon />
            </button>

            <div className="app-header-copy">
              <p className="app-eyebrow">Protected internal workspace</p>
              <h2>Daily operations</h2>
              <p className="muted-text">
                Member care, service administration, attendance, and reporting in one
                quiet workspace.
              </p>
            </div>
          </div>

          <div className="app-header-actions">
            <span className="status-badge status-badge-info">Authenticated session</span>
            <span className="status-badge status-badge-muted">{primaryRole}</span>
            <Link
              aria-label="Open settings"
              className="button button-ghost app-settings-gear"
              href="/settings/roles"
              onClick={() => {
                if (isMobileViewport) {
                  setIsMobileNavOpen(false);
                }
              }}
            >
              <AppSettingsGearIcon />
            </Link>
          </div>
        </header>

        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
