"use client";

import { createContext, useMemo, useState } from "react";

import type { SessionContextValue, SessionUser, SessionStatus } from "./types";

export const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<SessionStatus>("unauthenticated");
  const [user, setUser] = useState<SessionUser | null>(null);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      user,
      isAuthenticated: status === "authenticated" && Boolean(user),
      setAuthenticatedPreview(nextUser) {
        setUser(nextUser);
        setStatus("authenticated");
      },
      clearSession() {
        setUser(null);
        setStatus("unauthenticated");
      },
    }),
    [status, user],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
