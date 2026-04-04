import { apiClient } from "@/api/client";

import type { OpsNotificationFeed } from "../types";

export const opsApi = {
  getNotifications() {
    return apiClient.get<OpsNotificationFeed>("/api/ops/notifications/");
  },
};
