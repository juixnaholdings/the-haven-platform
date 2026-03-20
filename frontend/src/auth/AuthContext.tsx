import { createContext, useContext, useEffect, useState } from "react";

import { setUnauthorizedHandler } from "../api/client";
import { queryClient } from "../api/queryClient";
import { authApi } from "../domains/auth/api";
import type { AuthTokens, LoginPayload, User } from "../domains/types";
import { clearStoredTokens, getStoredTokens, saveStoredTokens } from "./storage";

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
  const [tokens, setTokens] = useState<AuthTokens | null>(getStoredTokens());

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearStoredTokens();
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
      const existingTokens = getStoredTokens();
      if (!existingTokens) {
        if (mounted) {
          setTokens(null);
          setUser(null);
          setStatus("unauthenticated");
        }
        return;
      }

      if (mounted) {
        setStatus("bootstrapping");
      }

      try {
        const currentUser = await authApi.getCurrentUser();
        if (!mounted) {
          return;
        }

        setTokens(getStoredTokens());
        setUser(currentUser);
        setStatus("authenticated");
      } catch {
        if (!mounted) {
          return;
        }

        clearStoredTokens();
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
    saveStoredTokens(response.tokens);
    setTokens(response.tokens);
    setUser(response.user);
    setStatus("authenticated");
    await queryClient.invalidateQueries();
    return response.user;
  }

  async function logout() {
    const currentTokens = getStoredTokens();

    try {
      if (currentTokens?.refresh) {
        await authApi.logout({ refresh: currentTokens.refresh });
      }
    } catch {
      // Local session state should still be cleared if the backend logout request fails.
    }

    clearStoredTokens();
    setTokens(null);
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }

  function clearSession() {
    clearStoredTokens();
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
