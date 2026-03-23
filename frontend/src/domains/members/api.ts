import { apiClient } from "../../api/client";
import type {
  MemberDetail,
  MemberListFilters,
  MemberListItem,
  MemberWritePayload,
} from "../types";

export const membersApi = {
  listMembers(filters: MemberListFilters = {}) {
    return apiClient.get<MemberListItem[]>("/api/members/", { params: filters });
  },
  getMember(memberId: number) {
    return apiClient.get<MemberDetail>(`/api/members/${memberId}/`);
  },
  createMember(payload: MemberWritePayload) {
    return apiClient.post<MemberDetail, MemberWritePayload>("/api/members/", payload);
  },
  updateMember(memberId: number, payload: Partial<MemberWritePayload>) {
    return apiClient.patch<MemberDetail, Partial<MemberWritePayload>>(
      `/api/members/${memberId}/`,
      payload,
    );
  },
};
