"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ErrorAlert } from "@/components/ErrorAlert";
import { useSession } from "@/auth/use-session";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapping, login } = useSession();
  const [identifier, setIdentifier] = useState("");
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
      await login({ identifier, password });
      router.replace(nextPath);
    } catch (error) {
      setSubmitError(error);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-stack">
        
        <div className="auth-card">
          <div className="auth-card-header">
            <h2>Welcome back</h2>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Username or email</span>
              <input
                autoComplete="username"
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="Enter username or email"
                required
                value={identifier}
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

          <ErrorAlert error={submitError} fallbackMessage="Server Error. Please Try Again." />
        </div>
      </div>
    </div>
  );
}
