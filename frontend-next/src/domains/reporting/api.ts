import { apiClient } from "@/api/client";

import type { DashboardOverview } from "../types";

export const reportingApi = {
  getDashboardOverview() {
    return apiClient.get<DashboardOverview>("/api/reports/dashboard/");
  },
};
