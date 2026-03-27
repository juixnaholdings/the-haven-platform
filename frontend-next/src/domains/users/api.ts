import { apiClient } from "@/api/client";

import type {
  RoleSummary,
  StaffUserCreatePayload,
  StaffUserListItem,
  StaffUserUpdatePayload,
} from "../types";

export const usersApi = {
  listStaffUsers() {
    return apiClient.get<StaffUserListItem[]>("/api/settings/staff-users/");
  },
  getStaffUser(staffUserId: number) {
    return apiClient.get<StaffUserListItem>(`/api/settings/staff-users/${staffUserId}/`);
  },
  createStaffUser(payload: StaffUserCreatePayload) {
    return apiClient.post<StaffUserListItem, StaffUserCreatePayload>(
      "/api/settings/staff-users/",
      payload,
    );
  },
  updateStaffUser(staffUserId: number, payload: StaffUserUpdatePayload) {
    return apiClient.patch<StaffUserListItem, StaffUserUpdatePayload>(
      `/api/settings/staff-users/${staffUserId}/`,
      payload,
    );
  },
  listRoleSummaries() {
    return apiClient.get<RoleSummary[]>("/api/settings/roles/");
  },
};
