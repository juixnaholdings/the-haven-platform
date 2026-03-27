import { apiClient } from "@/api/client";

import type {
  AttendanceReportSummary,
  DashboardOverview,
  FinanceSummary,
  GroupSummary,
  HouseholdSummary,
  MembershipSummary,
  ReportingDateRange,
} from "../types";

export const reportingApi = {
  getDashboardOverview(filters: ReportingDateRange = {}) {
    return apiClient.get<DashboardOverview>("/api/reports/dashboard/", { params: filters });
  },
  getMembershipSummary() {
    return apiClient.get<MembershipSummary>("/api/reports/members/");
  },
  getHouseholdSummary() {
    return apiClient.get<HouseholdSummary>("/api/reports/households/");
  },
  getGroupSummary() {
    return apiClient.get<GroupSummary>("/api/reports/groups/");
  },
  getAttendanceSummary(filters: ReportingDateRange = {}) {
    return apiClient.get<AttendanceReportSummary>("/api/reports/attendance/", { params: filters });
  },
  getFinanceSummary(filters: ReportingDateRange = {}) {
    return apiClient.get<FinanceSummary>("/api/reports/finance/", { params: filters });
  },
};
