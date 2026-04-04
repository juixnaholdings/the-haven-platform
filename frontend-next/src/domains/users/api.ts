import { apiClient } from "@/api/client";

import type {
  BasicUserElevationPayload,
  BasicUserListItem,
  RoleSummary,
  StaffInviteCreatePayload,
  StaffInviteListFilters,
  StaffInviteListItem,
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
  listBasicUsers(params?: { search?: string; is_active?: boolean; unassigned_only?: boolean }) {
    return apiClient.get<BasicUserListItem[]>("/api/settings/basic-users/", {
      params,
    });
  },
  elevateBasicUser(userId: number, payload: BasicUserElevationPayload) {
    return apiClient.post<StaffUserListItem, BasicUserElevationPayload>(
      `/api/settings/basic-users/${userId}/elevate/`,
      payload,
    );
  },
  listStaffInvites(params?: StaffInviteListFilters) {
    return apiClient.get<StaffInviteListItem[]>("/api/settings/staff-invites/", {
      params,
    });
  },
  createStaffInvite(payload: StaffInviteCreatePayload) {
    return apiClient.post<StaffInviteListItem, StaffInviteCreatePayload>(
      "/api/settings/staff-invites/",
      payload,
    );
  },
  revokeStaffInvite(staffInviteId: number) {
    return apiClient.patch<StaffInviteListItem>(
      `/api/settings/staff-invites/${staffInviteId}/revoke/`,
      {},
    );
  },
  listRoleSummaries() {
    return apiClient.get<RoleSummary[]>("/api/settings/roles/");
  },
};
