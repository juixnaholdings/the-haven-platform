"use client";

import { useCallback, useEffect, useState } from "react";

import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { ApiError } from "@/api/errors";
import { reportingApi } from "@/domains/reporting/api";
import type { DashboardOverview } from "@/domains/types";

function formatAmount(amount: string | number) {
  const numeric = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(numeric)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(numeric);
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const loadDashboardOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await reportingApi.getDashboardOverview();
      setDashboard(response);
    } catch (fetchError) {
      if (fetchError instanceof ApiError) {
        setError(fetchError);
      } else {
        setError(
          new ApiError({
            message: "Unable to load dashboard data.",
            statusCode: 0,
          }),
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboardOverview();
  }, [loadDashboardOverview]);

  if (isLoading) {
    return <LoadingState title="Loading dashboard metrics..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Dashboard metrics could not be loaded."
        message={error.message}
        onRetry={() => {
          void loadDashboardOverview();
        }}
      />
    );
  }

  if (!dashboard) {
    return (
      <ErrorState
        title="Dashboard is unavailable."
        message="No dashboard payload was returned by the reporting API."
        onRetry={() => {
          void loadDashboardOverview();
        }}
      />
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Protected reporting surface"
        title="Operational dashboard"
        description="A calm operational snapshot across members, households, ministries, attendance, and finance using the protected reporting backend."
      />

      <section className="metrics-grid">
        <StatCard label="Total members" tone="accent" value={dashboard.members.total_members} />
        <StatCard label="Active members" value={dashboard.members.active_members} />
        <StatCard label="Households" value={dashboard.households.total_households} />
        <StatCard label="Groups" value={dashboard.groups.total_groups} />
        <StatCard label="Events" value={dashboard.attendance.total_events} />
        <StatCard label="Net flow" value={formatAmount(dashboard.finance.net_flow)} />
      </section>

      <section className="panel-grid">
        <article className="panel">
          <h3>Attendance snapshot</h3>
          <dl className="definition-list">
            <div>
              <dt>Total attendance</dt>
              <dd>{dashboard.attendance.aggregate_total_attendance}</dd>
            </div>
            <div>
              <dt>Visitors</dt>
              <dd>{dashboard.attendance.aggregate_visitor_count}</dd>
            </div>
            <div>
              <dt>Member attendance rows</dt>
              <dd>{dashboard.attendance.total_member_attendance_records}</dd>
            </div>
          </dl>
        </article>

        <article className="panel">
          <h3>Finance balances</h3>
          <ul className="item-list">
            {dashboard.finance.balances_by_fund.map((fund) => (
              <li className="item-row" key={fund.id}>
                <div>
                  <strong>{fund.name}</strong>
                  <span>{fund.code}</span>
                </div>
                <strong>{formatAmount(fund.current_balance)}</strong>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <h3>People and ministry snapshot</h3>
          <dl className="definition-list">
            <div>
              <dt>Active members</dt>
              <dd>{dashboard.members.active_members}</dd>
            </div>
            <div>
              <dt>Households</dt>
              <dd>{dashboard.households.total_households}</dd>
            </div>
            <div>
              <dt>Active group memberships</dt>
              <dd>{dashboard.groups.total_active_affiliations}</dd>
            </div>
          </dl>
        </article>
      </section>
    </div>
  );
}
