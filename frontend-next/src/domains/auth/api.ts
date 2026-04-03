import { apiClient } from "@/api/client";

import type {
  EmailAvailabilityResponse,
  LoginPayload,
  LoginResponse,
  SignupPayload,
  SignupResponse,
  User,
  UsernameAvailabilityResponse,
} from "../types";

export const authApi = {
  login(payload: LoginPayload) {
    return apiClient.post<LoginResponse, LoginPayload>("/api/auth/login/", payload, {
      auth: false,
      retryOnUnauthorized: false,
    });
  },
  signup(payload: SignupPayload) {
    return apiClient.post<SignupResponse, SignupPayload>("/api/auth/signup/", payload, {
      auth: false,
      retryOnUnauthorized: false,
    });
  },
  checkUsernameAvailability(username: string) {
    return apiClient.get<UsernameAvailabilityResponse>("/api/auth/availability/username/", {
      auth: false,
      retryOnUnauthorized: false,
      params: { username },
    });
  },
  checkEmailAvailability(email: string) {
    return apiClient.get<EmailAvailabilityResponse>("/api/auth/availability/email/", {
      auth: false,
      retryOnUnauthorized: false,
      params: { email },
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
};
