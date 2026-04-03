"use client";

import Link from "next/link";
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
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-amber-50 via-slate-50 to-slate-100 px-6 py-8">
      <div className="w-full max-w-[520px] space-y-6">
        <div className="grid w-full gap-6 rounded-[1.65rem] border border-slate-200/80 bg-white/95 p-8 shadow-sm">
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
              className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-br from-[#16335f] to-[#27497d] px-4 py-2.5 font-semibold text-white shadow-[0_10px_24px_rgba(22,51,95,0.18)] transition hover:-translate-y-px hover:from-[#102748] hover:to-[#1e3f6e] disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSubmitting || isBootstrapping}
              type="submit"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <ErrorAlert error={submitError} fallbackMessage="Server Error. Please Try Again." />
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
