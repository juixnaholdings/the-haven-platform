import { apiClient } from "@/api/client";

import type {
  EmailAvailabilityResponse,
  LoginPayload,
  LoginResponse,
  StaffInviteAcceptPayload,
  StaffInviteValidationResponse,
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
  validateStaffInvite(staffInviteId: number, token: string) {
    return apiClient.get<StaffInviteValidationResponse>(
      `/api/auth/staff-invites/${staffInviteId}/validate/`,
      {
        auth: false,
        retryOnUnauthorized: false,
        params: { token },
      },
    );
  },
  acceptStaffInvite(staffInviteId: number, payload: StaffInviteAcceptPayload) {
    return apiClient.post<SignupResponse, StaffInviteAcceptPayload>(
      `/api/auth/staff-invites/${staffInviteId}/accept/`,
      payload,
      {
        auth: false,
        retryOnUnauthorized: false,
      },
    );
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
