"use client";

import { useMemo, useState } from "react";
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
import type { ReportingDateRange } from "@/domains/types";
import { formatAmount, formatDate } from "@/lib/formatters";

type DatePreset = "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CUSTOM";

const DATE_PRESET_OPTIONS: Array<{ value: DatePreset; label: string }> = [
  { value: "TODAY", label: "Today" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "THIS_MONTH", label: "This month" },
  { value: "CUSTOM", label: "Custom range" },
];

function getDatePresetLabel(preset: DatePreset): string {
  const matchedOption = DATE_PRESET_OPTIONS.find((option) => option.value === preset);
  return matchedOption?.label ?? preset;
}

export function ReportsPageScreen() {
  const [datePreset, setDatePreset] = useState<DatePreset>("THIS_MONTH");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const hasCompleteCustomRange = Boolean(startDate && endDate);
  const reportingFilters: ReportingDateRange = useMemo(() => {
    if (datePreset !== "CUSTOM") {
      return { date_preset: datePreset };
    }
    if (!hasCompleteCustomRange) {
      return {};
    }
    return {
      date_preset: "CUSTOM",
      start_date: startDate,
      end_date: endDate,
    };
  }, [datePreset, endDate, hasCompleteCustomRange, startDate]);

  const dashboardQuery = useQuery({
    queryKey: ["reporting", "dashboard", reportingFilters],
    queryFn: () => reportingApi.getDashboardOverview(reportingFilters),
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
    queryKey: ["reporting", "attendance", reportingFilters],
    queryFn: () => reportingApi.getAttendanceSummary(reportingFilters),
  });

  const financeQuery = useQuery({
    queryKey: ["reporting", "finance", reportingFilters],
    queryFn: () => reportingApi.getFinanceSummary(reportingFilters),
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
        description="Fetching membership, households, ministries, attendance trends, and finance period summaries."
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
  const hasDateFilter = Boolean(
    reportingFilters.date_preset || reportingFilters.start_date || reportingFilters.end_date,
  );
  const activeRangeLabel =
    datePreset === "CUSTOM"
      ? hasCompleteCustomRange
        ? `Custom (${startDate} to ${endDate})`
        : "Custom range pending"
      : getDatePresetLabel(datePreset);

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
        description="Operational reporting with practical date presets, attendance trends, participation snapshots, and finance period summaries."
        eyebrow="Reporting dashboard"
        meta={
          <>
            <StatusBadge
              label={hasDateFilter ? activeRangeLabel : "All-time reporting"}
              tone={datePreset === "CUSTOM" && !hasCompleteCustomRange ? "warning" : "info"}
            />
            <StatusBadge
              label={hasCompleteCustomRange || datePreset !== "CUSTOM" ? "Range applied" : "Awaiting dates"}
              tone={hasCompleteCustomRange || datePreset !== "CUSTOM" ? "success" : "warning"}
            />
          </>
        }
        title="Reports"
      />

      <FilterActionStrip
        actions={
          <button
            className="button button-secondary"
            onClick={() => {
              setDatePreset("THIS_MONTH");
              setStartDate("");
              setEndDate("");
            }}
            type="button"
          >
            Reset to this month
          </button>
        }
        filters={
          datePreset === "CUSTOM" ? (
            <>
              <label className="field">
                <span>Start date</span>
                <input onChange={(event) => setStartDate(event.target.value)} type="date" value={startDate} />
              </label>
              <label className="field">
                <span>End date</span>
                <input onChange={(event) => setEndDate(event.target.value)} type="date" value={endDate} />
              </label>
            </>
          ) : (
            <p className="m-0 text-sm text-slate-500">
              Preset ranges are resolved on the backend for operational consistency.
            </p>
          )
        }
        search={
          <label className="field">
            <span>Date preset</span>
            <select
              onChange={(event) => {
                const nextPreset = event.target.value as DatePreset;
                setDatePreset(nextPreset);
                if (nextPreset !== "CUSTOM") {
                  setStartDate("");
                  setEndDate("");
                }
              }}
              value={datePreset}
            >
              {DATE_PRESET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total members" tone="accent" value={membership.total_members} />
        <StatCard label="Events in range" value={attendance.total_events} />
        <StatCard label="Average attendance/event" value={attendance.average_total_attendance_per_event} />
        <StatCard label="Attendance capture" value={`${attendance.attendance_capture_rate_percent}%`} />
        <StatCard label="Group participation" value={`${groups.participation_rate_percent}%`} />
        <StatCard label="Posted transactions" value={finance.total_posted_transactions} />
        <StatCard label="Income in range" value={formatAmount(finance.total_income)} />
        <StatCard label="Net flow" value={formatAmount(finance.net_flow)} />
      </section>

      <BlockedFeatureCard
        description="Download/export endpoints are still out of scope, but the trend and period tables below are structured for copy, print, and operational handoff."
        reason="This keeps reporting useful now without introducing fake or half-built export contracts."
        title="Export readiness"
        tone="info"
      />

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Membership and household overview</h3>
              <p className="m-0 text-sm text-slate-500">
                Keep this as the current baseline for people operations and care coordination.
              </p>
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

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Group participation</h3>
              <p className="m-0 text-sm text-slate-500">
                Operational participation visibility for ministry leaders and membership follow-up.
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
              <dt>Inactive groups</dt>
              <dd>{groups.inactive_groups}</dd>
            </div>
            <div>
              <dt>Members with active group</dt>
              <dd>{groups.members_with_active_group}</dd>
            </div>
            <div>
              <dt>Members without active group</dt>
              <dd>{groups.members_without_active_group}</dd>
            </div>
            <div>
              <dt>Participation rate</dt>
              <dd>{groups.participation_rate_percent}%</dd>
            </div>
          </dl>

          {groups.top_groups.length === 0 ? (
            <EmptyState
              description="Create ministries and add active memberships to populate group participation insights."
              title="No group participation data available"
            />
          ) : (
            <ul className="item-list">
              {groups.top_groups.map((groupCount) => (
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
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Attendance summary</h3>
              <p className="m-0 text-sm text-slate-500">
                Anonymous totals, event counts, and capture coverage for day-to-day attendance operations.
              </p>
            </div>
          </div>
          <dl className="definition-list">
            <div>
              <dt>Events in range</dt>
              <dd>{attendance.total_events}</dd>
            </div>
            <div>
              <dt>Events with summary</dt>
              <dd>{attendance.events_with_summary}</dd>
            </div>
            <div>
              <dt>Events without summary</dt>
              <dd>{attendance.events_without_summary}</dd>
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

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Recent attendance events</h3>
              <p className="m-0 text-sm text-slate-500">
                Latest service/event entries with recorded totals and member row counts.
              </p>
            </div>
          </div>

          {attendance.recent_service_events.length === 0 ? (
            <EmptyState
              description="Record attendance to populate the latest event summary list."
              title="No attendance events are available"
            />
          ) : (
            <EntityTable
              columns={[
                {
                  header: "Event",
                  cell: (event) => (
                    <div className="grid gap-1">
                      <strong>{event.title}</strong>
                      <span className="block text-xs text-slate-500">
                        {getServiceEventTypeLabel(event.event_type)}
                      </span>
                    </div>
                  ),
                },
                {
                  header: "Date",
                  cell: (event) => formatDate(event.service_date),
                },
                {
                  header: "Attendance",
                  cell: (event) => event.total_attendance,
                },
                {
                  header: "Member records",
                  cell: (event) => event.member_attendance_count,
                },
              ]}
              getRowKey={(event) => event.id}
              rows={attendance.recent_service_events}
            />
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Attendance trend by day</h3>
            <p className="m-0 text-sm text-slate-500">
              Copy-friendly trend table for weekly reviews and leadership reporting.
            </p>
          </div>
        </div>

        {attendance.attendance_trend.length === 0 ? (
          <EmptyState
            description="No attendance trend data is available in the selected date range."
            title="No trend rows available"
          />
        ) : (
          <EntityTable
            columns={[
              {
                header: "Date",
                cell: (trendRow) => formatDate(trendRow.period_start),
              },
              {
                header: "Events",
                cell: (trendRow) => trendRow.event_count,
              },
              {
                header: "Attendance",
                cell: (trendRow) => trendRow.attendance_total,
              },
              {
                header: "Member records",
                cell: (trendRow) => trendRow.member_attendance_records,
              },
            ]}
            getRowKey={(trendRow) => trendRow.period_start}
            rows={attendance.attendance_trend}
          />
        )}
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Finance summary</h3>
            <p className="m-0 text-sm text-slate-500">
              Period totals and category highlights for weekly and monthly finance check-ins.
            </p>
          </div>
        </div>
        <dl className="definition-list">
          <div>
            <dt>Total fund accounts</dt>
            <dd>{finance.total_fund_accounts}</dd>
          </div>
          <div>
            <dt>Posted transactions</dt>
            <dd>{finance.total_posted_transactions}</dd>
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
      </section>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Finance period breakdown</h3>
              <p className="m-0 text-sm text-slate-500">
                Daily period rows suitable for operations review and copy/paste exports.
              </p>
            </div>
          </div>

          {finance.period_breakdown.length === 0 ? (
            <EmptyState
              description="Post finance transactions to populate period-level summaries."
              title="No finance period data is available"
            />
          ) : (
            <EntityTable
              columns={[
                {
                  header: "Date",
                  cell: (periodRow) => formatDate(periodRow.period_start),
                },
                {
                  header: "Income",
                  cell: (periodRow) => formatAmount(periodRow.total_income),
                },
                {
                  header: "Expense",
                  cell: (periodRow) => formatAmount(periodRow.total_expense),
                },
                {
                  header: "Transfers",
                  cell: (periodRow) => formatAmount(periodRow.total_transfers),
                },
                {
                  header: "Net flow",
                  cell: (periodRow) => formatAmount(periodRow.net_flow),
                },
              ]}
              getRowKey={(periodRow) => `${periodRow.period_start}-${periodRow.period_end}`}
              rows={finance.period_breakdown}
            />
          )}
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="section-header">
            <div>
              <h3>Top finance categories</h3>
              <p className="m-0 text-sm text-slate-500">
                Highest-volume categories in the selected range for quick expense and income focus.
              </p>
            </div>
          </div>

          {finance.top_categories.length === 0 ? (
            <EmptyState
              description="Add category names to posted transactions to unlock category-level reporting."
              title="No categorized transactions yet"
            />
          ) : (
            <ul className="item-list">
              {finance.top_categories.map((category) => (
                <li className="item-row" key={category.category_name}>
                  <div>
                    <strong>{category.category_name}</strong>
                    <span>Total amount moved</span>
                  </div>
                  <strong>{formatAmount(category.total_amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3>Balances by fund</h3>
            <p className="m-0 text-sm text-slate-500">
              Current fund posture based on posted ledger lines and selected report cutoff.
            </p>
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
