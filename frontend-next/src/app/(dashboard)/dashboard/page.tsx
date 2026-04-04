"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatCard } from "@/components/StatCard";
import { ApiError } from "@/api/errors";
import { attendanceApi } from "@/domains/attendance/api";
import { CreateServiceEventModal, RecordAttendanceModal } from "@/domains/attendance/components";
import { financeApi } from "@/domains/finance/api";
import { getTransactionTypeLabel } from "@/domains/finance/options";
import { reportingApi } from "@/domains/reporting/api";
import type { DashboardOverview, ServiceEventListItem, TransactionListItem } from "@/domains/types";
import { formatDate } from "@/lib/formatters";
import Image from "next/image";

function formatAmount(amount: string | number) {
  const numeric = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(numeric)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "GHS",
    maximumFractionDigits: 2,
  }).format(numeric);
}

function getTodayIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isRecordAttendanceModalOpen, setIsRecordAttendanceModalOpen] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState<ServiceEventListItem[]>([]);
  const [isUpcomingEventsUnavailable, setIsUpcomingEventsUnavailable] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<TransactionListItem[]>([]);
  const [isRecentTransactionsUnavailable, setIsRecentTransactionsUnavailable] = useState(false);

  const attendanceBarRows = useMemo(() => {
    const sourceRows = [...dashboard?.attendance.recent_service_events ?? []]
      .sort((left, right) => left.service_date.localeCompare(right.service_date))
      .slice(-7);

    return sourceRows.map((row) => {
      const parsedDate = new Date(row.service_date);
      const dateLabel = Number.isNaN(parsedDate.getTime())
        ? row.service_date
        : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(parsedDate);
      return {
        id: row.id,
        title: row.title,
        dateLabel,
        totalAttendance: row.total_attendance,
      };
    });
  }, [dashboard?.attendance.recent_service_events]);

  const attendanceBarMax = useMemo(
    () => Math.max(...attendanceBarRows.map((row) => row.totalAttendance), 1),
    [attendanceBarRows],
  );

  const attendanceAxisTicks = useMemo(() => {
    const tickCount = 4;
    return Array.from({ length: tickCount + 1 }, (_, index) =>
      Math.round((attendanceBarMax * (tickCount - index)) / tickCount),
    );
  }, [attendanceBarMax]);

  const upcomingEventCalendarRows = useMemo(() => {
    const groupedEvents = new Map<string, ServiceEventListItem[]>();
    for (const event of upcomingEvents) {
      const bucket = groupedEvents.get(event.service_date) ?? [];
      bucket.push(event);
      groupedEvents.set(event.service_date, bucket);
    }

    return Array.from(groupedEvents.entries()).map(([serviceDate, events]) => {
      const parsedDate = new Date(serviceDate);
      const isValidDate = !Number.isNaN(parsedDate.getTime());
      return {
        serviceDate,
        weekdayLabel: isValidDate
          ? new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(parsedDate)
          : "Day",
        dayNumberLabel: isValidDate ? String(parsedDate.getDate()).padStart(2, "0") : "--",
        fullDateLabel: isValidDate
          ? new Intl.DateTimeFormat("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(parsedDate)
          : serviceDate,
        eventTitles: events.map((event) => event.title),
      };
    });
  }, [upcomingEvents]);

  const loadDashboardOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await reportingApi.getDashboardOverview();
      setDashboard(response);

      try {
        const upcomingServiceEvents = await attendanceApi.listServiceEvents({
          is_active: true,
          service_date_from: getTodayIsoDate(),
          page_size: 12,
        });
        setUpcomingEvents(
          [...upcomingServiceEvents]
            .sort((left, right) => left.service_date.localeCompare(right.service_date))
            .slice(0, 10),
        );
        setIsUpcomingEventsUnavailable(false);
      } catch {
        setUpcomingEvents([]);
        setIsUpcomingEventsUnavailable(true);
      }

      try {
        const recentTransactionsResponse = await financeApi.listTransactionsPage({
          page_size: 8,
        });
        setRecentTransactions(
          [...recentTransactionsResponse.items]
            .sort((left, right) => right.posted_at.localeCompare(left.posted_at))
            .slice(0, 8),
        );
        setIsRecentTransactionsUnavailable(false);
      } catch {
        setRecentTransactions([]);
        setIsRecentTransactionsUnavailable(true);
      }
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
      <div className="flex justify-between gap-2.5 h-16">
        <div className="app-header-copy flex-1 w-[60%] items-start">
          <h2>Dashboard</h2>
        </div>
        <div className="flex items-end gap-5">
          <div className="flex-col">
            <button
              className="button button-primary relative overflow-hidden group border-0 px-5"
              onClick={() => setIsCreateEventModalOpen(true)}
              type="button"
            >
              <span className="absolute right-0 w-8 h-32 -mt-12 transition-all duration-1000 transform translate-x-12 bg-white opacity-10 rotate-12 group-hover:-translate-x-40 ease"></span>
              <span className="relative">Add Event</span>
            </button>
          </div>
          <div className="flex-col">
            <button
              className="button button-primary relative overflow-hidden group border-0 px-5"
              onClick={() => setIsRecordAttendanceModalOpen(true)}
              type="button"
            >
              <span className="absolute right-0 w-8 h-32 -mt-12 transition-all duration-1000 transform translate-x-12 bg-white opacity-10 rotate-12 group-hover:-translate-x-40 ease"></span>
              <span className="relative">Record Attendance</span>
            </button>
          </div>
        </div>
      </div>

      <section className="flex gap-5 h-48 top-0">
        <div className="flex-1 w-1/3">
          <StatCard
            label="Total members"
            value={dashboard.members.total_members}
            icon={<Image width="25" height="25" src="https://img.icons8.com/windows/32/conference-call.png" alt="conference-call" />}
          />
        </div>
        <div className="flex-1 w-1/3">
          <StatCard
            label="Last Sunday's Attendance"
            value={dashboard.attendance.total_events}
            icon={<Image width="25" height="25" src="https://img.icons8.com/parakeet-line/48/checked-user-male.png" alt="checked-user-male" />}
          />
        </div>
        <div className="flex-1 w-1/3">
          <StatCard
            label="Current Balance"
            value={formatAmount(dashboard.finance.net_flow)}
            icon={<Image width="25" height="25" src="https://img.icons8.com/nolan/64/wallet.png" alt="wallet" />}
          />
        </div>
      </section>

      <section className="flex gap-5 h-96 my-2.5">
        <div className="flex-auto w-[70%]">
          <article className="metric-card h-full">
            <div className="flex h-full min-h-0 flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <h3>Attendance Trends</h3>
                {/* <span className="text-xs font-medium text-slate-500">Attendance by event date</span> */}
              </div>

              {attendanceBarRows.length === 0 ? (
                <p className="m-0 text-sm text-slate-500">No event attendance data is available yet.</p>
              ) : (
                <div className="grid h-full min-h-[220px] grid-cols-[3rem_minmax(0,1fr)] gap-3">
                  <div className="flex h-full flex-col justify-between pb-10 text-[11px] font-medium text-slate-500">
                    {attendanceAxisTicks.map((tick) => (
                      <span className="leading-none" key={tick}>
                        {tick}
                      </span>
                    ))}
                  </div>

                  <div className="relative h-full min-h-0">
                    <div className="absolute inset-0 grid grid-rows-4 pb-10">
                      <div className="border-x border-b border-slate-200/70" />
                      <div className="border-x border-b border-slate-200/70" />
                      <div className="border-x border-b border-slate-200/70" />
                      <div className="border-x border-b border-slate-200/70" />
                    </div>

                    <div
                      className="relative z-10 grid h-full items-end gap-3 pb-10 pl-2 pr-1"
                      style={{
                        gridTemplateColumns: `repeat(${attendanceBarRows.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {attendanceBarRows.map((row) => {
                        const heightPercent = Math.max(
                          4,
                          (row.totalAttendance / attendanceBarMax) * 100,
                        );
                        return (
                          <div className="flex h-full items-end justify-center" key={row.id}>
                            <div className="relative flex w-full max-w-10 items-end justify-center">
                              <span className="absolute -top-6 text-[11px] font-semibold text-slate-700">
                                {row.totalAttendance}
                              </span>
                              <div
                                className="w-full rounded-t-md bg-[#16335f]"
                                style={{ height: `${heightPercent}%` }}
                                title={`${row.title} - ${row.totalAttendance}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div
                      className="absolute inset-x-0 bottom-0 grid gap-3 pl-2 pr-1"
                      style={{
                        gridTemplateColumns: `repeat(${attendanceBarRows.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {attendanceBarRows.map((row) => (
                        <span className="truncate text-center text-[11px] font-medium text-slate-500" key={row.id}>
                          {row.dateLabel}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </article>
        </div>
        <div className="flex-none w-[32%]">
          <article className="metric-card h-full">
            <div className="flex h-full min-h-0 flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <h3>Upcoming Events</h3>
                <span className="text-xs font-medium text-slate-500">Calendar</span>
              </div>

              {isUpcomingEventsUnavailable ? (
                <p className="m-0 rounded-xl border border-amber-300/70 bg-amber-50/80 px-3 py-2 text-sm text-amber-800">
                  Upcoming events are unavailable right now.
                </p>
              ) : upcomingEventCalendarRows.length === 0 ? (
                <p className="m-0 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2 text-sm text-slate-500">
                  No upcoming events are scheduled yet.
                </p>
              ) : (
                <ul className="space-y-2 overflow-y-auto pr-1">
                  {upcomingEventCalendarRows.map((row) => (
                    <li
                      className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3"
                      key={row.serviceDate}
                    >
                      <div className="flex flex-col items-center justify-center rounded-xl bg-white/90 px-2 py-1.5 shadow-sm ring-1 ring-slate-200/60">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          {row.weekdayLabel}
                        </span>
                        <strong className="text-lg leading-none text-[#16335f]">{row.dayNumberLabel}</strong>
                      </div>
                      <div className="min-w-0">
                        <p className="m-0 text-xs font-medium text-slate-500">{row.fullDateLabel}</p>
                        <ul className="mt-1 space-y-1">
                          {row.eventTitles.slice(0, 2).map((eventTitle, eventIndex) => (
                            <li
                              className="truncate text-sm font-medium text-slate-700"
                              key={`${row.serviceDate}-${eventTitle}-${eventIndex}`}
                            >
                              {eventTitle}
                            </li>
                          ))}
                          {row.eventTitles.length > 2 ? (
                            <li className="text-xs text-slate-500">+{row.eventTitles.length - 2} more event(s)</li>
                          ) : null}
                        </ul>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="h-96 my-2.5">
        <article className="metric-card w-full h-full">
          <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
          <h3>Recent Transactions</h3>
              <span className="text-xs font-medium text-slate-500">Ledger snapshot</span>
            </div>

            <div className="min-h-0 overflow-auto rounded-2xl border border-slate-200/80 bg-white/80">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 bg-slate-100/95 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-3 py-2.5">Reference</th>
                    <th className="px-3 py-2.5">Type</th>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Movement</th>
                    <th className="px-3 py-2.5">Event</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {isRecentTransactionsUnavailable ? (
                    <tr>
                      <td className="px-3 py-6 text-sm text-amber-800" colSpan={5}>
                        Recent transactions are unavailable right now.
                      </td>
                    </tr>
                  ) : recentTransactions.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6 text-sm text-slate-500" colSpan={5}>
                        No transactions have been posted yet.
                      </td>
                    </tr>
                  ) : (
                    recentTransactions.map((transaction) => (
                      <tr className="hover:bg-slate-50/80" key={transaction.id}>
                        <td className="px-3 py-2.5 align-top">
                          <div className="grid gap-1">
                            <Link
                              className="font-semibold text-[#16335f] hover:underline"
                              href={`/finance/transactions/${transaction.id}`}
                            >
                              {transaction.reference_no}
                            </Link>
                            <span className="truncate text-xs text-slate-500">{transaction.description}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            {getTransactionTypeLabel(transaction.transaction_type)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-top text-slate-700">{formatDate(transaction.transaction_date)}</td>
                        <td className="px-3 py-2.5 align-top">
                          <div className="grid gap-0.5">
                            <span>In: {formatAmount(transaction.total_in_amount)}</span>
                            <span className="text-xs text-slate-500">Out: {formatAmount(transaction.total_out_amount)}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 align-top text-slate-700">
                          {transaction.service_event_title || "Not linked"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </article>
      </section>

      <CreateServiceEventModal
        isOpen={isCreateEventModalOpen}
        onClose={() => setIsCreateEventModalOpen(false)}
        onCreated={(serviceEvent) => {
          router.push(`/events/${serviceEvent.id}`);
        }}
      />
      <RecordAttendanceModal
        isOpen={isRecordAttendanceModalOpen}
        onClose={() => setIsRecordAttendanceModalOpen(false)}
        onCompleted={(serviceEvent) => {
          router.push(`/events/${serviceEvent.id}/attendance`);
        }}
      />
    </div>
  );
}
