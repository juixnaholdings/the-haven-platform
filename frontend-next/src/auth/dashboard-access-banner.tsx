"use client";

import Link from "next/link";

import { useSession } from "./use-session";

export function DashboardAccessBanner() {
  const { status, isAuthenticated } = useSession();

  if (status === "bootstrapping") {
    return (
      <p className="session-banner session-banner-info">
        Bootstrapping session scaffold.
      </p>
    );
  }

  if (!isAuthenticated) {
    return (
      <p className="session-banner session-banner-warning">
        Milestone 0 preview mode: the dashboard guard is scaffolded but not yet
        connected to Django auth. Final redirect enforcement lands in Milestone 1.{" "}
        <Link className="link-inline" href="/login">
          Open login route.
        </Link>
      </p>
    );
  }

  return (
    <p className="session-banner session-banner-info">
      Authenticated preview session active.
    </p>
  );
}
