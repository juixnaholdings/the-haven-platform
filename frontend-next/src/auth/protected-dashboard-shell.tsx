"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

import { LoadingState } from "@/components/LoadingState";

import { useSession } from "./use-session";

interface ProtectedDashboardShellProps {
  children: React.ReactNode;
}

interface NavItem {
  activePrefix: string;
  href: string;
  label: string;
  navIcon: string | React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    activePrefix: "/dashboard",
    navIcon: (
      <Image
        width="20"
        height="20"
        src="https://img.icons8.com/ios/50/performance-macbook.png"
        alt="performance-macbook"
      />
    ),
  },
  {
    label: "Members",
    href: "/members",
    activePrefix: "/members",
    navIcon: (
      <Image
        width="20"
        height="20"
        src="https://img.icons8.com/ios/50/conference-call--v1.png"
        alt="conference-call--v1"
      />
    ),
  },
  {
    label: "Households",
    href: "/households",
    activePrefix: "/households",
    navIcon: (
      <Image
        width="20"
        height="20"
        src="https://img.icons8.com/material-outlined/24/cottage.png"
        alt="cottage"
      />
    ),
  },
  {
    label: "Ministries",
    href: "/groups",
    activePrefix: "/groups",
    navIcon: (
      <Image
        width="20"
        height="20"
        src="https://img.icons8.com/external-fauzidea-detailed-outline-fauzidea/64/external-government-building-fauzidea-detailed-outline-fauzidea-3.png"
        alt="external-government-building-fauzidea-detailed-outline-fauzidea-3"
      />
    ),
  },
  {
    label: "Events",
    href: "/events",
    activePrefix: "/events",
    navIcon: (
      <Image
        width="20"
        height="20"
        src="https://img.icons8.com/external-icongeek26-outline-icongeek26/64/external-events-donation-and-charity-icongeek26-outline-icongeek26.png"
        alt="external-events-donation-and-charity-icongeek26-outline-icongeek26"
      />
    ),
  },
  {
    label: "Attendance",
    href: "/attendance",
    activePrefix: "/attendance",
    navIcon: (
      <Image
        width="20"
        height="20"
        src="https://img.icons8.com/parakeet-line/48/checked-user-male.png"
        alt="checked-user-male"
      />
    ),
  },
  {
    label: "Finance",
    href: "/finance",
    activePrefix: "/finance",
    navIcon: (
      <Image
        width="20"
        height="20"
        src="https://img.icons8.com/ios/50/sales-performance-balance.png"
        alt="sales-performance-balance"
      />
    ),
  },
  {
    label: "Reports",
    href: "/reports",
    activePrefix: "/reports",
    navIcon: (
      <Image
        width="20"
        height="20"
        src="https://img.icons8.com/parakeet-line/48/graph-report.png"
        alt="graph-report"
      />
    ),
  },
];

const mobileMediaQuery = "(max-width: 1024px)";

function getDisplayName(
  user: NonNullable<ReturnType<typeof useSession>["user"]>,
) {
  const fullName = `${user.first_name} ${user.last_name}`.trim();
  return fullName || user.username;
}

function HamburgerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M4 7h16M4 12h16M4 17h12"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export function ProtectedDashboardShell({
  children,
}: ProtectedDashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isBootstrapping, status, user, logout } =
    useSession();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    if (status !== "unauthenticated") {
      return;
    }

    const query =
      typeof window !== "undefined"
        ? window.location.search.replace(/^\?/, "")
        : "";
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
    return <LoadingState title="Page Loading. Please wait..." />;
  }

  if (!isAuthenticated || !user) {
    return <LoadingState title="Redirecting to sign in..." />;
  }

  // const primaryRole = user.role_names?.[0] ?? "Authenticated staff";
  // const displayName = getDisplayName(user);
  // const initials = displayName.slice(0, 2).toUpperCase();
  const hasAuditAccess = Boolean(
    user.is_superuser ||
    user.role_names?.some(
      (roleName) => roleName === "Super Admin" || roleName === "Church Admin",
    ),
  );
  const visibleNavItems = hasAuditAccess
    ? [
        ...navItems,
        {
          label: "Audit",
          href: "/audit",
          activePrefix: "/audit",
          navIcon: (
            <Image
              width="20"
              height="20"
              src="https://img.icons8.com/dotty/80/fine-print.png"
              alt="fine-print"
            />
          ),
        },
      ]
    : navItems;
  const shellClassName = [
    "app-shell",
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
      ) : // <HamburgerIcon />

      null}

      <aside className="app-sidebar z-20 h-screen">
        <div className="app-sidebar-brand flex-1 gap-5 items-start">
          <div className="flex-col">
            <Image
              width="35"
              height="35"
              src="https://img.icons8.com/external-others-cattaleeya-thongsriphong/64/external-chapel-coronavirus-blue-others-cattaleeya-thongsriphong.png"
              alt="external-chapel-coronavirus-blue-others-cattaleeya-thongsriphong"
            />
          </div>
          <div className="flex">
            <h3 className="mt-0">THE HAVEN</h3>
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
                  {item.navIcon}
                </span>
                <span className="app-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <header className="bg-white min-h-2.5 fixed w-full z-10">
        <div className="flex justify-between">
          <div className="app-header-left items-center flex-1 ml-96">
            Search Box
          </div>
          <div className="flex items-end gap-0.5 ml-1.5">
            <div className="flex-col m-2.5 ">
              <Link
                aria-label="Open settings"
                className=""
                href="/settings/roles"
              >
                <div className="bg-white text-gray-400 hover:bg-gray-200 p-2 rounded-full flex items-center justify-center">
                  <Image
                    width={25}
                    height={25}
                    src="https://img.icons8.com/ios/50/appointment-reminders--v1.png"
                    alt="appointment-reminders--v1"
                  />
                </div>
              </Link>
            </div>
            <div className="flex-col m-2">
              <Link
                aria-label="Open settings"
                className=""
                href="/settings/roles"
              >
                <div className="bg-white text-gray-400 hover:bg-gray-200 p-2 rounded-full flex items-center justify-center">
                  <Image
                    width={30}
                    height={30}
                    src="https://img.icons8.com/puffy/32/settings.png"
                    alt="settings"
                  />
                </div>
              </Link>
            </div>
            <div className="flex-col m-2">
              <Link
                aria-label="Open settings"
                className=""
                href="/settings/roles"
              >
                <div className="bg-white text-gray-400 hover:bg-gray-200 p-2 rounded-full flex items-center justify-center">
                  <Image
                    width={30}
                    height={30}
                    src="https://img.icons8.com/ios/50/user-male-circle--v1.png"
                    alt="user-male-circle--v1"
                  />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </header>
      <div className="app-stage mt-16">
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
