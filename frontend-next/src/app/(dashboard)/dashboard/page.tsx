"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatCard } from "@/components/StatCard";
import { ApiError } from "@/api/errors";
import { CreateServiceEventModal, RecordAttendanceModal } from "@/domains/attendance/components";
import { reportingApi } from "@/domains/reporting/api";
import type { DashboardOverview } from "@/domains/types";
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

export default function DashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [isRecordAttendanceModalOpen, setIsRecordAttendanceModalOpen] = useState(false);

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
      <div className="flex justify-between gap-2.5 h-16">
        <div className="app-header-copy flex-1 w-[60%] items-start">
          <h2>Dashboard</h2>
        </div>
        <div className="flex items-end gap-5">
          <div className="flex-col">
            <button
              className="relative rounded px-5 py-2.5 overflow-hidden group bg-green-500 hover:bg-gradient-to-r hover:from-green-500 hover:to-green-400 text-white hover:ring-2 hover:ring-offset-2 hover:ring-green-400 transition-all ease-out duration-300"
              onClick={() => setIsCreateEventModalOpen(true)}
              type="button"
            >
              <span className="absolute right-0 w-8 h-32 -mt-12 transition-all duration-1000 transform translate-x-12 bg-white opacity-10 rotate-12 group-hover:-translate-x-40 ease"></span>
              <span className="relative">Add Event</span>
            </button>
          </div>
          <div className="flex-col">
            <button
              className="relative rounded px-5 py-2.5 overflow-hidden group bg-green-500 hover:bg-gradient-to-r hover:from-green-500 hover:to-green-400 text-white hover:ring-2 hover:ring-offset-2 hover:ring-green-400 transition-all ease-out duration-300"
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
            <div>
              <h3>Upcoming Events</h3>
            </div>
          </article>
        </div>
      </section>

      <section className="h-96 my-2.5">
        <article className="metric-card w-full h-full">
          <h3>Recent Transactions</h3>
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
