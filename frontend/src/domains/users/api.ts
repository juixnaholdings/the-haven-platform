import { apiClient } from "../../api/client";
import type { RoleSummary, StaffUserListItem } from "../types";

export const usersApi = {
  listStaffUsers() {
    return apiClient.get<StaffUserListItem[]>("/api/settings/staff-users/");
  },
  listRoleSummaries() {
    return apiClient.get<RoleSummary[]>("/api/settings/roles/");
  },
};
