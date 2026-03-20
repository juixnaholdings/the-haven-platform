import { apiClient } from "../../api/client";
import type {
  LoginPayload,
  LoginResponse,
  LogoutPayload,
  RefreshTokenPayload,
  User,
  VerifyTokenPayload,
} from "../types";

export const authApi = {
  login(payload: LoginPayload) {
    return apiClient.post<LoginResponse, LoginPayload>("/api/auth/login/", payload, {
      auth: false,
      retryOnUnauthorized: false,
    });
  },
  logout(payload: LogoutPayload) {
    return apiClient.post<Record<string, never>, LogoutPayload>("/api/auth/logout/", payload);
  },
  getCurrentUser() {
    return apiClient.get<User>("/api/auth/me/");
  },
  refreshToken(payload: RefreshTokenPayload) {
    return apiClient.post<{ access: string; refresh?: string }, RefreshTokenPayload>(
      "/api/auth/token/refresh/",
      payload,
      {
        auth: false,
        retryOnUnauthorized: false,
      },
    );
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
