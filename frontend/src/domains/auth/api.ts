import { apiClient } from "../../api/client";
import type { LoginPayload, LoginResponse, User, VerifyTokenPayload } from "../types";

export const authApi = {
  login(payload: LoginPayload) {
    return apiClient.post<LoginResponse, LoginPayload>("/api/auth/login/", payload, {
      auth: false,
      retryOnUnauthorized: false,
    });
  },

  logout() {
    return apiClient.post<Record<string, never>>("/api/auth/logout/", undefined, {
      auth: false,
      retryOnUnauthorized: false,
    });
  },

  getCurrentUser() {
    return apiClient.get<User>("/api/auth/me/");
  },

  refreshToken() {
    return apiClient.post<{ access: string }>("/api/auth/token/refresh/", undefined, {
      auth: false,
      retryOnUnauthorized: false,
    });
  },

  verifyToken(payload: VerifyTokenPayload) {
    return apiClient.post<Record<string, never>, VerifyTokenPayload>(
      "/api/auth/token/verify/",
      payload,
      {
        auth: false,
        retryOnUnauthorized: false,
      },
    );
  },
};
