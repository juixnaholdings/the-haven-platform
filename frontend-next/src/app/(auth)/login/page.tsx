"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ButtonLoadingContent } from "@/components";
import { ErrorAlert } from "@/components/ErrorAlert";
import { useSession } from "@/auth/use-session";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isBootstrapping, login } = useSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const isSubmitGuarded = !identifier.trim() || !password;
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
          <div className="grid gap-2">
            <h2>Welcome back</h2>
          </div>

          <form className="grid gap-5" onSubmit={handleSubmit}>
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
              disabled={isSubmitting || isBootstrapping || isSubmitGuarded}
              type="submit"
            >
              <ButtonLoadingContent isLoading={isSubmitting} loadingText="Signing in...">
                Sign in
              </ButtonLoadingContent>
            </button>
          </form>

          <ErrorAlert error={submitError} fallbackMessage="Sign In Failed" />
          <p className="m-0 text-sm text-slate-500">
            New to The Haven?{" "}
            <Link className="font-semibold text-[#16335f] hover:underline" href="/signup">
              Create an account
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
