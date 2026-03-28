"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import {
  BlockedFeatureCard,
  EmptyState,
  EntityTable,
  ErrorState,
  FilterActionStrip,
  LoadingState,
  PageHeader,
  StatCard,
  StatusBadge,
} from "@/components";
import { getServiceEventTypeLabel } from "@/domains/attendance/options";
import { reportingApi } from "@/domains/reporting/api";
import { formatAmount } from "@/lib/formatters";

export function ReportsPageScreen() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const dashboardQuery = useQuery({
    queryKey: ["reporting", "dashboard", { startDate, endDate }],
    queryFn: () =>
      reportingApi.getDashboardOverview({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
  });

  const membershipQuery = useQuery({
    queryKey: ["reporting", "members"],
    queryFn: () => reportingApi.getMembershipSummary(),
  });

  const householdQuery = useQuery({
    queryKey: ["reporting", "households"],
    queryFn: () => reportingApi.getHouseholdSummary(),
  });

  const groupQuery = useQuery({
    queryKey: ["reporting", "groups"],
    queryFn: () => reportingApi.getGroupSummary(),
  });

  const attendanceQuery = useQuery({
    queryKey: ["reporting", "attendance", { startDate, endDate }],
    queryFn: () =>
      reportingApi.getAttendanceSummary({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
  });

  const financeQuery = useQuery({
    queryKey: ["reporting", "finance", { startDate, endDate }],
    queryFn: () =>
      reportingApi.getFinanceSummary({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
  });

  const isLoading =
    dashboardQuery.isLoading ||
    membershipQuery.isLoading ||
    householdQuery.isLoading ||
    groupQuery.isLoading ||
    attendanceQuery.isLoading ||
    financeQuery.isLoading;

  if (isLoading) {
    return (
      <LoadingState
        description="Fetching summary metrics across membership, households, ministries, attendance, and finance."
        title="Loading reports dashboard"
      />
    );
  }

  const error =
    dashboardQuery.error ||
    membershipQuery.error ||
    householdQuery.error ||
    groupQuery.error ||
    attendanceQuery.error ||
    financeQuery.error;

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void dashboardQuery.refetch();
          void membershipQuery.refetch();
          void householdQuery.refetch();
          void groupQuery.refetch();
          void attendanceQuery.refetch();
          void financeQuery.refetch();
        }}
        title="Reports dashboard could not be loaded"
      />
    );
  }

  const dashboard = dashboardQuery.data;
  const membership = membershipQuery.data;
  const households = householdQuery.data;
  const groups = groupQuery.data;
  const attendance = attendanceQuery.data;
  const finance = financeQuery.data;
  const hasDateFilter = Boolean(startDate || endDate);

  if (!dashboard || !membership || !households || !groups || !attendance || !finance) {
    return null;
  }

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <div className="inline-actions">
            <Link className="button button-secondary" href="/dashboard">
              Dashboard
            </Link>
            <Link className="button button-ghost" href="/finance">
              Open ledger
            </Link>
            <button className="button button-ghost" disabled type="button">
              Export CSV
            </button>
          </div>
        }
        description="Use this cross-domain reporting surface for operational summaries. Date filters apply only where the backend actually supports them."
        eyebrow="Reporting dashboard"
        meta={
          <StatusBadge
            label={hasDateFilter ? "Date-filtered reporting" : "All-time reporting"}
            tone="info"
          />
        }
        title="Reports"
      />

      <FilterActionStrip
        actions={
          <button
            className="button button-secondary"
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
            type="button"
          >
            Reset range
          </button>
        }
        filters={
          <label className="field">
            <span>End date</span>
            <input onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
          </label>
        }
        search={
          <label className="field">
            <span>Start date</span>
            <input onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
          </label>
        }
      />

      <section className="metrics-grid">
        <StatCard label="Total members" tone="accent" value={membership.total_members} />
        <StatCard label="Households" value={households.total_households} />
        <StatCard label="Active groups" value={groups.active_groups} />
        <StatCard label="Events in range" value={attendance.total_events} />
        <StatCard label="Net flow" value={formatAmount(finance.net_flow)} />
        <StatCard label="Active affiliations" value={groups.total_active_affiliations} />
      </section>

      <BlockedFeatureCard
        description="CSV and PDF export actions are visible in design references, but export endpoints are not part of the current backend contract."
        reason="This release-ready reports surface stays read-only and on-screen to avoid fake export flows."
        title="Report exports"
        tone="info"
      />

      <div className="panel-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Membership summary</h3>
              <p className="muted-text">Current all-time member counts from the membership reporting endpoint.</p>
            </div>
          </div>
          <dl className="definition-list">
            <div>
              <dt>Total members</dt>
              <dd>{membership.total_members}</dd>
            </div>
            <div>
              <dt>Active members</dt>
              <dd>{membership.active_members}</dd>
            </div>
            <div>
              <dt>Inactive members</dt>
              <dd>{membership.inactive_members}</dd>
            </div>
          </dl>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Household summary</h3>
              <p className="muted-text">Current all-time household structure metrics.</p>
            </div>
          </div>
          <dl className="definition-list">
            <div>
              <dt>Total households</dt>
              <dd>{households.total_households}</dd>
            </div>
            <div>
              <dt>Households with active head</dt>
              <dd>{households.households_with_active_head}</dd>
            </div>
            <div>
              <dt>Average household size</dt>
              <dd>{households.average_household_size}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="panel-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Group summary</h3>
              <p className="muted-text">
                Flat group totals and active affiliation counts from the current ministry analogue.
              </p>
            </div>
          </div>

          <dl className="definition-list">
            <div>
              <dt>Total groups</dt>
              <dd>{groups.total_groups}</dd>
            </div>
            <div>
              <dt>Active groups</dt>
              <dd>{groups.active_groups}</dd>
            </div>
            <div>
              <dt>Total active affiliations</dt>
              <dd>{groups.total_active_affiliations}</dd>
            </div>
          </dl>

          {groups.group_membership_counts.length === 0 ? (
            <EmptyState
              description="Create ministries and add memberships to populate this summary."
              title="No group membership counts are available"
            />
          ) : (
            <ul className="item-list">
              {groups.group_membership_counts.map((groupCount) => (
                <li className="item-row" key={groupCount.id}>
                  <div>
                    <strong>{groupCount.name}</strong>
                    <span>Active affiliations</span>
                  </div>
                  <strong>{groupCount.active_membership_count}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Attendance summary</h3>
              <p className="muted-text">Anonymous summary counts and member attendance stay separate by design.</p>
            </div>
          </div>
          <dl className="definition-list">
            <div>
              <dt>Events in range</dt>
              <dd>{attendance.total_events}</dd>
            </div>
            <div>
              <dt>Total attendance</dt>
              <dd>{attendance.aggregate_total_attendance}</dd>
            </div>
            <div>
              <dt>Visitors</dt>
              <dd>{attendance.aggregate_visitor_count}</dd>
            </div>
            <div>
              <dt>Member attendance records</dt>
              <dd>{attendance.total_member_attendance_records}</dd>
            </div>
          </dl>

          {attendance.event_type_counts.length === 0 ? (
            <EmptyState
              description="Record attendance over time to populate the event-type summary."
              title="No event-type counts are available"
            />
          ) : (
            <ul className="item-list">
              {attendance.event_type_counts.map((eventTypeCount) => (
                <li className="item-row" key={eventTypeCount.event_type}>
                  <div>
                    <strong>{getServiceEventTypeLabel(eventTypeCount.event_type)}</strong>
                  </div>
                  <strong>{eventTypeCount.count}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Finance summary</h3>
            <p className="muted-text">Posted-ledger totals and current balances by fund across the selected range.</p>
          </div>
        </div>

        <dl className="definition-list">
          <div>
            <dt>Total fund accounts</dt>
            <dd>{finance.total_fund_accounts}</dd>
          </div>
          <div>
            <dt>Total income</dt>
            <dd>{formatAmount(finance.total_income)}</dd>
          </div>
          <div>
            <dt>Total expense</dt>
            <dd>{formatAmount(finance.total_expense)}</dd>
          </div>
          <div>
            <dt>Total transfers</dt>
            <dd>{formatAmount(finance.total_transfers)}</dd>
          </div>
          <div>
            <dt>Net flow</dt>
            <dd>{formatAmount(finance.net_flow)}</dd>
          </div>
        </dl>

        <p className="muted-text">Detailed fund balances are shown in the dedicated table below.</p>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>Balances by fund</h3>
            <p className="muted-text">Current fund balance table for quick financial posture checks.</p>
          </div>
        </div>

        {finance.balances_by_fund.length === 0 ? (
          <EmptyState
            description="Create or seed fund accounts and post finance transactions to populate this section."
            title="No fund balances are available"
          />
        ) : (
          <EntityTable
            columns={[
              {
                header: "Fund",
                cell: (fund) => (
                  <div className="cell-stack">
                    <strong>{fund.name}</strong>
                    <span className="table-subtext">{fund.code}</span>
                  </div>
                ),
              },
              {
                header: "Current balance",
                cell: (fund) => formatAmount(fund.current_balance),
              },
            ]}
            getRowKey={(fund) => fund.id}
            rows={finance.balances_by_fund}
          />
        )}
      </section>
    </div>
  );
}
