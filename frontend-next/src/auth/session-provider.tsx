"use client";

import { createContext, useEffect, useMemo, useState } from "react";

import { setUnauthorizedHandler } from "@/api/client";
import { authApi } from "@/domains/auth/api";

import { clearAccessToken, getAccessToken, setAccessToken } from "./storage";
import type { SessionContextValue, SessionStatus } from "./types";

export const SessionContext = createContext<SessionContextValue | undefined>(
  undefined,
);

export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [status, setStatus] = useState<SessionStatus>("bootstrapping");
  const [user, setUser] = useState<SessionContextValue["user"]>(null);
  const [tokens, setTokens] = useState<SessionContextValue["tokens"]>(
    getAccessToken() ? { access: getAccessToken() as string } : null,
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAccessToken();
      setTokens(null);
      setUser(null);
      setStatus("unauthenticated");
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrapSession() {
      try {
        let access = getAccessToken();

        if (!access) {
          const refreshed = await authApi.refreshToken();
          access = refreshed.access;
          setAccessToken(access);
        }

        const currentUser = await authApi.getCurrentUser();
        if (!mounted) {
          return;
        }

        setTokens({ access });
        setUser(currentUser);
        setStatus("authenticated");
      } catch {
        if (!mounted) {
          return;
        }

        clearAccessToken();
        setTokens(null);
        setUser(null);
        setStatus("unauthenticated");
      }
    }

    void bootstrapSession();

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      status,
      user,
      tokens,
      isAuthenticated: status === "authenticated" && Boolean(user),
      isBootstrapping: status === "bootstrapping",
      async login(credentials) {
        const response = await authApi.login(credentials);

        setAccessToken(response.tokens.access);
        setTokens({ access: response.tokens.access });
        setUser(response.user);
        setStatus("authenticated");

        return response.user;
      },
      async logout() {
        try {
          await authApi.logout();
        } catch {
          // Local session must still clear even if network logout fails.
        }

        clearAccessToken();
        setTokens(null);
        setUser(null);
        setStatus("unauthenticated");
      },
      clearSession() {
        clearAccessToken();
        setTokens(null);
        setUser(null);
        setStatus("unauthenticated");
      },
    }),
    [status, tokens, user],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
