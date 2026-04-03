import { apiClient } from "@/api/client";

import { normalizeListResponse } from "../list";
import type {
  AttendanceSummary,
  AttendanceSummaryWritePayload,
  ListResponse,
  ListResult,
  MemberAttendance,
  MemberAttendanceCreatePayload,
  MemberAttendanceListFilters,
  MemberAttendanceUpdatePayload,
  ServiceEventDetail,
  ServiceEventListFilters,
  ServiceEventListItem,
  ServiceEventWritePayload,
} from "../types";

export const attendanceApi = {
  listServiceEvents(filters: ServiceEventListFilters = {}) {
    return apiClient.get<ServiceEventListItem[]>("/api/attendance/", { params: filters });
  },
  async listServiceEventsPage(
    filters: ServiceEventListFilters = {},
  ): Promise<ListResult<ServiceEventListItem>> {
    const response = await apiClient.get<ListResponse<ServiceEventListItem>>("/api/attendance/", {
      params: filters,
    });
    return normalizeListResponse(response);
  },
  getServiceEvent(serviceEventId: number) {
    return apiClient.get<ServiceEventDetail>(`/api/attendance/${serviceEventId}/`);
  },
  getCurrentOrUpcomingSundayService() {
    return apiClient.get<ServiceEventListItem>("/api/attendance/sunday-service/current/");
  },
  createServiceEvent(payload: ServiceEventWritePayload) {
    return apiClient.post<ServiceEventDetail, ServiceEventWritePayload>("/api/attendance/", payload);
  },
  updateServiceEvent(serviceEventId: number, payload: Partial<ServiceEventWritePayload>) {
    return apiClient.patch<ServiceEventDetail, Partial<ServiceEventWritePayload>>(
      `/api/attendance/${serviceEventId}/`,
      payload,
    );
  },
  upsertAttendanceSummary(serviceEventId: number, payload: AttendanceSummaryWritePayload) {
    return apiClient.put<ServiceEventDetail, AttendanceSummaryWritePayload>(
      `/api/attendance/${serviceEventId}/summary/`,
      payload,
    );
  },
  updateAttendanceSummary(serviceEventId: number, payload: Partial<AttendanceSummaryWritePayload>) {
    return apiClient.patch<AttendanceSummary, Partial<AttendanceSummaryWritePayload>>(
      `/api/attendance/${serviceEventId}/summary/`,
      payload,
    );
  },
  listMemberAttendance(serviceEventId: number, filters: MemberAttendanceListFilters = {}) {
    return apiClient.get<MemberAttendance[]>(`/api/attendance/${serviceEventId}/member-attendance/`, {
      params: filters,
    });
  },
  createMemberAttendance(serviceEventId: number, payload: MemberAttendanceCreatePayload) {
    return apiClient.post<ServiceEventDetail, MemberAttendanceCreatePayload>(
      `/api/attendance/${serviceEventId}/member-attendance/`,
      payload,
    );
  },
  updateMemberAttendance(
    serviceEventId: number,
    memberAttendanceId: number,
    payload: MemberAttendanceUpdatePayload,
  ) {
    return apiClient.patch<MemberAttendance, MemberAttendanceUpdatePayload>(
      `/api/attendance/${serviceEventId}/member-attendance/${memberAttendanceId}/`,
      payload,
    );
  },
};
