import { apiClient } from "@/api/client";

import { normalizeListResponse } from "../list";
import type {
  AuditEvent,
  AuditEventListFilters,
  ListResponse,
  ListResult,
} from "../types";

export const auditApi = {
  async listAuditEventsPage(
    filters: AuditEventListFilters = {},
  ): Promise<ListResult<AuditEvent>> {
    const response = await apiClient.get<ListResponse<AuditEvent>>("/api/audit/events/", {
      params: filters,
    });
    return normalizeListResponse(response);
  },
  getAuditEvent(auditEventId: number) {
    return apiClient.get<AuditEvent>(`/api/audit/events/${auditEventId}/`);
  },
};
