import { createContext, useContext, useEffect, useState } from "react";

import { setUnauthorizedHandler } from "../api/client";
import { queryClient } from "../api/queryClient";
import { authApi } from "../domains/auth/api";
import type { AuthTokens, LoginPayload, User } from "../domains/types";
import { clearAccessToken, getAccessToken, setAccessToken } from "./storage";

type AuthStatus = "bootstrapping" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (credentials: LoginPayload) => Promise<User>;
  logout: () => Promise<void>;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("bootstrapping");
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(
    getAccessToken() ? { access: getAccessToken() as string } : null,
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearAccessToken();
      setTokens(null);
      setUser(null);
      setStatus("unauthenticated");
      queryClient.clear();
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrapSession() {
      if (mounted) {
        setStatus("bootstrapping");
      }

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

  async function login(credentials: LoginPayload): Promise<User> {
    const response = await authApi.login(credentials);

    setAccessToken(response.tokens.access);
    setTokens({ access: response.tokens.access });
    setUser(response.user);
    setStatus("authenticated");

    await queryClient.invalidateQueries();

    return response.user;
  }

  async function logout() {
    try {
      await authApi.logout();
    } catch {
      // Even if logout fails remotely, local memory state must be cleared.
    }

    clearAccessToken();
    setTokens(null);
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }

  function clearSession() {
    clearAccessToken();
    setTokens(null);
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        tokens,
        isAuthenticated: status === "authenticated" && Boolean(user),
        isBootstrapping: status === "bootstrapping",
        login,
        logout,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
