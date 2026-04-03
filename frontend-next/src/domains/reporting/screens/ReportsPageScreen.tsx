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
import type { SundayAttendanceState } from "@/domains/types";
import { reportingApi } from "@/domains/reporting/api";
import { formatAmount, formatDate } from "@/lib/formatters";

function getSundayAttendanceStateMeta(state: SundayAttendanceState) {
  switch (state) {
    case "RECORDED":
      return { label: "Summary and member records captured", tone: "success" as const };
    case "IN_PROGRESS":
      return { label: "Attendance is in progress", tone: "warning" as const };
    default:
      return { label: "Attendance not started", tone: "muted" as const };
  }
}

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
  const sundaySummary = attendance?.sunday_services;

  if (!dashboard || !membership || !households || !groups || !attendance || !finance) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
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

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total members" tone="accent" value={membership.total_members} />
        <StatCard label="Households" value={households.total_households} />
        <StatCard label="Active groups" value={groups.active_groups} />
        <StatCard label="Events in range" value={attendance.total_events} />
        <StatCard label="System Sundays in range" value={sundaySummary?.total_services ?? 0} />
        <StatCard label="Sundays fully recorded" value={sundaySummary?.fully_recorded_count ?? 0} />
        <StatCard label="Net flow" value={formatAmount(finance.net_flow)} />
        <StatCard label="Active affiliations" value={groups.total_active_affiliations} />
      </section>

      <BlockedFeatureCard
        description="CSV and PDF export actions are visible in design references, but export endpoints are not part of the current backend contract."
        reason="This release-ready reports surface stays read-only and on-screen to avoid fake export flows."
        title="Report exports"
        tone="info"
      />

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Membership summary</h3>
              <p className="m-0 text-sm text-slate-500">Current all-time member counts from the membership reporting endpoint.</p>
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

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Household summary</h3>
              <p className="m-0 text-sm text-slate-500">Current all-time household structure metrics.</p>
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

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Group summary</h3>
              <p className="m-0 text-sm text-slate-500">
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

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Attendance summary</h3>
              <p className="m-0 text-sm text-slate-500">Anonymous summary counts and member attendance stay separate by design.</p>
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

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Sunday attendance operations</h3>
            <p className="m-0 text-sm text-slate-500">
              Keep system-managed Sunday services visible so weekly attendance work is easy to monitor.
            </p>
          </div>
          <Link className="button button-secondary button-compact" href="/attendance">
            Open attendance overview
          </Link>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Sunday services in range" tone="accent" value={sundaySummary?.total_services ?? 0} />
          <StatCard label="With summary" value={sundaySummary?.with_summary_count ?? 0} />
          <StatCard label="With member records" value={sundaySummary?.with_member_records_count ?? 0} />
          <StatCard label="Partially recorded" value={sundaySummary?.partially_recorded_count ?? 0} />
        </div>

        {sundaySummary?.latest_service ? (
          <div className="mt-4 rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="grid gap-1">
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-blue-700">Latest Sunday service</p>
                <h4 className="m-0 text-sm font-semibold text-slate-900">{sundaySummary.latest_service.title}</h4>
                <p className="m-0 text-sm text-slate-600">{formatDate(sundaySummary.latest_service.service_date)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={getSundayAttendanceStateMeta(sundaySummary.latest_service.attendance_state).label}
                  tone={getSundayAttendanceStateMeta(sundaySummary.latest_service.attendance_state).tone}
                />
                <Link
                  className="button button-primary button-compact"
                  href={`/events/${sundaySummary.latest_service.id}/attendance`}
                >
                  {sundaySummary.latest_service.attendance_state === "NOT_STARTED"
                    ? "Take attendance"
                    : "Continue attendance"}
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {sundaySummary && sundaySummary.recent_services.length > 0 ? (
          <div className="mt-4">
            <EntityTable
              columns={[
                {
                  header: "Sunday service",
                  cell: (serviceEvent) => (
                    <div className="grid gap-1">
                      <Link className="font-semibold text-[#16335f] hover:underline" href={`/events/${serviceEvent.id}`}>
                        {serviceEvent.title}
                      </Link>
                      <span className="block text-xs text-slate-500">{formatDate(serviceEvent.service_date)}</span>
                    </div>
                  ),
                },
                {
                  header: "Progress",
                  cell: (serviceEvent) => {
                    const state = getSundayAttendanceStateMeta(serviceEvent.attendance_state);
                    return <StatusBadge label={state.label} tone={state.tone} />;
                  },
                },
                {
                  header: "Summary total",
                  cell: (serviceEvent) => serviceEvent.summary_total_count || "-",
                },
                {
                  header: "Member records",
                  cell: (serviceEvent) => serviceEvent.member_attendance_count,
                },
                {
                  header: "Actions",
                  className: "cell-actions",
                  cell: (serviceEvent) => (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Link className="button button-secondary button-compact" href={`/events/${serviceEvent.id}`}>
                        View
                      </Link>
                      <Link
                        className="button button-ghost button-compact"
                        href={`/events/${serviceEvent.id}/attendance`}
                      >
                        {serviceEvent.attendance_state === "NOT_STARTED" ? "Take attendance" : "Continue"}
                      </Link>
                    </div>
                  ),
                },
              ]}
              getRowKey={(serviceEvent) => serviceEvent.id}
              rows={sundaySummary.recent_services}
            />
          </div>
        ) : (
          <EmptyState
            description="System-managed Sunday services have not been generated for the selected range yet."
            title="No Sunday services in this reporting window"
          />
        )}
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Finance summary</h3>
            <p className="m-0 text-sm text-slate-500">Posted-ledger totals and current balances by fund across the selected range.</p>
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

        <p className="m-0 text-sm text-slate-500">Detailed fund balances are shown in the dedicated table below.</p>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Balances by fund</h3>
            <p className="m-0 text-sm text-slate-500">Current fund balance table for quick financial posture checks.</p>
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
                  <div className="grid gap-1">
                    <strong>{fund.name}</strong>
                    <span className="block text-xs text-slate-500">{fund.code}</span>
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
