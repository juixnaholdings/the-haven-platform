import { apiClient } from "../../api/client";
import type {
  GroupDetail,
  GroupListFilters,
  GroupListItem,
  GroupMembership,
  GroupMembershipCreatePayload,
  GroupMembershipUpdatePayload,
  GroupWritePayload,
} from "../types";

export const groupsApi = {
  listGroups(filters: GroupListFilters = {}) {
    return apiClient.get<GroupListItem[]>("/api/groups/", { params: filters });
  },
  getGroup(groupId: number) {
    return apiClient.get<GroupDetail>(`/api/groups/${groupId}/`);
  },
  createGroup(payload: GroupWritePayload) {
    return apiClient.post<GroupDetail, GroupWritePayload>("/api/groups/", payload);
  },
  updateGroup(groupId: number, payload: Partial<GroupWritePayload>) {
    return apiClient.patch<GroupDetail, Partial<GroupWritePayload>>(`/api/groups/${groupId}/`, payload);
  },
  addMember(groupId: number, payload: GroupMembershipCreatePayload) {
    return apiClient.post<GroupDetail, GroupMembershipCreatePayload>(
      `/api/groups/${groupId}/members/`,
      payload,
    );
  },
  updateMembership(groupId: number, membershipId: number, payload: GroupMembershipUpdatePayload) {
    return apiClient.patch<GroupMembership, GroupMembershipUpdatePayload>(
      `/api/groups/${groupId}/memberships/${membershipId}/`,
      payload,
    );
  },
};
