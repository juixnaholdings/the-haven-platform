import type { AuthTokens, LoginPayload, User } from "@/domains/types";

export type SessionStatus = "bootstrapping" | "authenticated" | "unauthenticated";

export interface SessionContextValue {
  status: SessionStatus;
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (credentials: LoginPayload) => Promise<User>;
  logout: () => Promise<void>;
  clearSession: () => void;
}
