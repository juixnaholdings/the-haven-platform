"use client";

import Link from "next/link";
import { useState } from "react";

import { PageHeader } from "@/components";
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
      <PageHeader
        actions={
          <Link className="button button-secondary" href="/settings/profile">
            Back to profile
          </Link>
        }
        description="Update your email details and password preferences."
        eyebrow="Settings / account"
        title="Manage account"
      />

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

          {errorMessage ? <p className="field-feedback field-feedback-error">{errorMessage}</p> : null}
          {saveMessage ? <p className="field-feedback field-feedback-success">{saveMessage}</p> : null}

          <div className="flex flex-wrap items-center gap-2.5">
            <button className="button button-primary" type="submit">
              Save account changes
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
