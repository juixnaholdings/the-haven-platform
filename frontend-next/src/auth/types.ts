export type SessionStatus = "bootstrapping" | "unauthenticated" | "authenticated";

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  roleNames: string[];
}

export interface SessionContextValue {
  status: SessionStatus;
  user: SessionUser | null;
  isAuthenticated: boolean;
  setAuthenticatedPreview: (user: SessionUser) => void;
  clearSession: () => void;
}
