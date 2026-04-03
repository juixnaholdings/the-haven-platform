"use client";

import Link from "next/link";
import { useState } from "react";

import { useSession } from "@/auth/use-session";

export default function SettingsAccountPage() {
  const { user } = useSession();
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  if (!user) {
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSaveMessage("");

    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        setErrorMessage("Enter your current password to change password.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage("New password and confirmation must match.");
        return;
      }
      if (newPassword.length < 8) {
        setErrorMessage("New password must be at least 8 characters.");
        return;
      }
    }

    setSaveMessage("Account preferences saved for this session.");
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200/80 pb-5">
        <div className="grid max-w-4xl gap-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-amber-700/85">Settings / account</p>
          <h1 className="text-[clamp(1.8rem,2.25vw,2.4rem)] font-semibold tracking-tight text-slate-900">
            Manage account
          </h1>
          <p className="max-w-[72ch] text-sm text-slate-600">
            Update your email details and password preferences.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            href="/settings/profile"
          >
            Back to profile
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field">
              <span>Email</span>
              <input
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>

            <label className="field">
              <span>Current password</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                value={currentPassword}
              />
            </label>

            <label className="field">
              <span>New password</span>
              <input
                autoComplete="new-password"
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                value={newPassword}
              />
            </label>

            <label className="field">
              <span>Confirm new password</span>
              <input
                autoComplete="new-password"
                onChange={(event) => setConfirmPassword(event.target.value)}
                type="password"
                value={confirmPassword}
              />
            </label>
          </div>

          {errorMessage ? (
            <p className="text-sm text-red-700">{errorMessage}</p>
          ) : null}
          {saveMessage ? (
            <p className="text-sm text-emerald-700">{saveMessage}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#16335f] to-[#27497d] px-4 py-2.5 font-semibold text-white shadow-[0_10px_24px_rgba(22,51,95,0.18)] transition hover:-translate-y-px hover:from-[#102748] hover:to-[#1e3f6e]"
              type="submit"
            >
              Save account changes
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
