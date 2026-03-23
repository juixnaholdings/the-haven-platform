import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";
import { ErrorAlert } from "../components/ErrorAlert";

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const nextPath = new URLSearchParams(location.search).get("next") || "/dashboard";
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      navigate(nextPath, { replace: true });
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate(nextPath, { replace: true });
    }
  }, [isAuthenticated, navigate, nextPath]);

  return (
    <div className="auth-layout">
      <div className="auth-card">
        <p className="app-eyebrow">The Haven</p>
        <h1>Sign in to continue</h1>
        <p className="muted-text">
          Use your backend credentials. The app keeps the access token in memory
          and restores your session from a secure refresh cookie when possible.
        </p>

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            loginMutation.mutate({ username, password });
          }}
        >
          <label className="field">
            <span>Username</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          <button
            className="button button-primary"
            type="submit"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <ErrorAlert
          error={loginMutation.error}
          fallbackMessage="Unable to sign in."
        />
      </div>
    </div>
  );
}
