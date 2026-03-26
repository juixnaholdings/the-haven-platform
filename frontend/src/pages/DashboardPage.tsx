import { useQuery } from "@tanstack/react-query";

import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { reportingApi } from "../domains/reporting/api";
import { formatAmount } from "../utils/formatters";

export function DashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ["reporting", "dashboard"],
    queryFn: () => reportingApi.getDashboardOverview(),
  });

  if (dashboardQuery.isLoading) {
    return <LoadingState title="Loading dashboard metrics" />;
  }

  if (dashboardQuery.error) {
    return (
      <ErrorState
        title="Dashboard metrics could not be loaded"
        error={dashboardQuery.error}
        onRetry={() => {
          void dashboardQuery.refetch();
        }}
      />
    );
  }

  const dashboard = dashboardQuery.data;
  if (!dashboard) {
    return null;
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Protected reporting surface"
        title="Operational dashboard"
        description="This dashboard proves the current frontend session bootstrap and protected API flow against the existing reporting backend."
      />

      <section className="metrics-grid">
        <StatCard label="Total members" value={dashboard.members.total_members} tone="accent" />
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
      </section>
    </div>
  );
}
