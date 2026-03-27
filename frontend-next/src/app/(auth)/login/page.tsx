"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ErrorAlert } from "@/components/ErrorAlert";
import { useSession } from "@/auth/use-session";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapping, login } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const nextPath =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("next") || "/dashboard"
      : "/dashboard";

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    router.replace(nextPath);
  }, [isAuthenticated, nextPath, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      await login({ username, password });
      router.replace(nextPath);
    } catch (error) {
      setSubmitError(error);
      setIsSubmitting(false);
    }
  }

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
              Calm, trustworthy church administration for members, households,
              ministries, services, and attendance.
            </p>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <p className="app-eyebrow">Secure sign in</p>
            <h2>Welcome back</h2>
            <p className="muted-text">
              Sign in with your backend credentials. Access tokens remain in
              memory and the session restores from the secure refresh cookie.
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Username</span>
              <input
                autoComplete="username"
                onChange={(event) => setUsername(event.target.value)}
                required
                value={username}
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>

            <button
              className="button button-primary button-block"
              disabled={isSubmitting || isBootstrapping}
              type="submit"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <ErrorAlert error={submitError} fallbackMessage="Unable to sign in." />

          <p className="muted-text helper-text">
            Migration scope: only login and dashboard are active in `frontend-next`
            for Milestone 1.
          </p>
          <Link className="button button-ghost" href="/dashboard">
            Continue to dashboard route
          </Link>
        </div>
      </div>
    </div>
  );
}
