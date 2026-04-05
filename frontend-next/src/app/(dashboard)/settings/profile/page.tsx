"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { FormModalShell, PageHeader } from "@/components";
import { useSession } from "@/auth/use-session";

export default function SettingsProfilePage() {
  const { user } = useSession();
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fullName = useMemo(() => {
    const value = `${firstName} ${lastName}`.trim();
    return value || user?.username || "User";
  }, [firstName, lastName, user?.username]);

  if (!user) {
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveMessage("Profile details saved for this session.");
    setIsEditModalOpen(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button className="button button-primary" onClick={() => setIsEditModalOpen(true)} type="button">
              Edit profile
            </button>
            <Link className="button button-secondary" href="/settings/account">
              Manage account
            </Link>
          </div>
        }
        description="View and update your basic profile details."
        eyebrow="Settings / profile"
        title="Profile"
      />

      <section className="grid gap-4 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="section-header">
          <div>
            <h3 className="m-0 text-lg font-semibold tracking-tight text-slate-900">{fullName}</h3>
            <p className="m-0 text-sm text-slate-500">@{user.username}</p>
          </div>
        </div>

        <dl className="grid gap-3.5 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">First name</dt>
            <dd className="mt-1 text-sm text-slate-700">{firstName || "Not set"}</dd>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last name</dt>
            <dd className="mt-1 text-sm text-slate-700">{lastName || "Not set"}</dd>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date of birth</dt>
            <dd className="mt-1 text-sm text-slate-700">{dateOfBirth || "Not set"}</dd>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone number</dt>
            <dd className="mt-1 text-sm text-slate-700">{phoneNumber || "Not set"}</dd>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Username</dt>
            <dd className="mt-1 text-sm text-slate-700">@{user.username}</dd>
          </div>
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
            <dd className="mt-1 text-sm text-slate-700">{user.email}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-2.5">
          <button className="button button-primary" onClick={() => setIsEditModalOpen(true)} type="button">
            Edit profile details
          </button>
        </div>

        {saveMessage ? <p className="field-feedback field-feedback-success">{saveMessage}</p> : null}
      </section>

      <FormModalShell
        description="Update your basic profile details."
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        size="large"
        title="Edit profile"
      >
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field">
              <span>First name</span>
              <input onChange={(event) => setFirstName(event.target.value)} value={firstName} />
            </label>

            <label className="field">
              <span>Last name</span>
              <input onChange={(event) => setLastName(event.target.value)} value={lastName} />
            </label>

            <label className="field">
              <span>Date of birth</span>
              <input onChange={(event) => setDateOfBirth(event.target.value)} type="date" value={dateOfBirth} />
            </label>

            <label className="field">
              <span>Phone number</span>
              <input
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="e.g. +1 555 0102"
                value={phoneNumber}
              />
            </label>

            <label className="field">
              <span>Username</span>
              <input disabled value={user.username} />
            </label>

            <label className="field">
              <span>Email</span>
              <input disabled value={user.email} />
            </label>
          </div>

          {saveMessage ? <p className="field-feedback field-feedback-success">{saveMessage}</p> : null}

          <div className="flex flex-wrap items-center gap-2.5">
            <button className="button button-primary" type="submit">
              Save profile
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
