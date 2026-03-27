import { apiClient } from "../../api/client";
import { normalizeListResponse } from "../list";
import type {
  HouseholdDetail,
  HouseholdListFilters,
  HouseholdListItem,
  HouseholdMembershipCreatePayload,
  HouseholdMembershipUpdatePayload,
  ListResponse,
  ListResult,
  HouseholdWritePayload,
} from "../types";

export const householdsApi = {
  listHouseholds(filters: HouseholdListFilters = {}) {
    return apiClient.get<HouseholdListItem[]>("/api/households/", { params: filters });
  },
  async listHouseholdsPage(
    filters: HouseholdListFilters = {},
  ): Promise<ListResult<HouseholdListItem>> {
    const response = await apiClient.get<ListResponse<HouseholdListItem>>("/api/households/", {
      params: filters,
    });
    return normalizeListResponse(response);
  },
  getHousehold(householdId: number) {
    return apiClient.get<HouseholdDetail>(`/api/households/${householdId}/`);
  },
  createHousehold(payload: HouseholdWritePayload) {
    return apiClient.post<HouseholdDetail, HouseholdWritePayload>("/api/households/", payload);
  },
  updateHousehold(householdId: number, payload: Partial<HouseholdWritePayload>) {
    return apiClient.patch<HouseholdDetail, Partial<HouseholdWritePayload>>(
      `/api/households/${householdId}/`,
      payload,
    );
  },
  addMember(householdId: number, payload: HouseholdMembershipCreatePayload) {
    return apiClient.post<HouseholdDetail, HouseholdMembershipCreatePayload>(
      `/api/households/${householdId}/members/`,
      payload,
    );
  },
  updateMembership(
    householdId: number,
    membershipId: number,
    payload: HouseholdMembershipUpdatePayload,
  ) {
    return apiClient.patch<HouseholdDetail["members"][number], HouseholdMembershipUpdatePayload>(
      `/api/households/${householdId}/memberships/${membershipId}/`,
      payload,
    );
  },
};
