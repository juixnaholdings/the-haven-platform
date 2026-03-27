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
      <div className="auth-stack">
        <div className="auth-brand">
          <div className="auth-brand-mark" aria-hidden="true">
            TH
          </div>
          <div className="auth-brand-copy">
            <p className="app-eyebrow">Refined clerical minimalism</p>
            <h1>The Haven</h1>
            <p className="muted-text">
              Calm, trustworthy church administration for members, households, ministries,
              services, and attendance.
            </p>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <p className="app-eyebrow">Secure sign in</p>
            <h2>Welcome back</h2>
            <p className="muted-text">
              Use your backend credentials. Access tokens stay in memory and the session
              restores from the secure refresh cookie when available.
            </p>
          </div>

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
              className="button button-primary button-block"
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
    </div>
  );
}
