"use client";

import Link from "next/link";
import { useState } from "react";

import { FormModalShell, PageHeader } from "@/components";
import { useSession } from "@/auth/use-session";

export default function SettingsAccountPage() {
  const { user } = useSession();
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
    setIsEditModalOpen(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button className="button button-primary" onClick={() => setIsEditModalOpen(true)} type="button">
              Edit account
            </button>
            <Link className="button button-secondary" href="/settings/profile">
              Back to profile
            </Link>
          </div>
        }
        description="Update your email details and password preferences."
        eyebrow="Settings / account"
        title="Manage account"
      />

      <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <dl className="grid gap-3.5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
            <dd className="mt-1 text-sm text-slate-700">{email}</dd>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Password update</dt>
            <dd className="mt-1 text-sm text-slate-700">
              {newPassword || confirmPassword || currentPassword ? "Pending change in editor" : "No pending password change"}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <button className="button button-primary" onClick={() => setIsEditModalOpen(true)} type="button">
            Edit account details
          </button>
        </div>

        {errorMessage ? <p className="mt-4 field-feedback field-feedback-error">{errorMessage}</p> : null}
        {saveMessage ? <p className="mt-4 field-feedback field-feedback-success">{saveMessage}</p> : null}
      </section>

      <FormModalShell
        description="Update your email details and password preferences."
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        size="large"
        title="Edit account"
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field">
              <span>Email</span>
              <input onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
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
            <button className="button button-secondary" onClick={() => setIsEditModalOpen(false)} type="button">
              Close
            </button>
          </div>
        </form>
      </FormModalShell>
    </div>
  );
}
