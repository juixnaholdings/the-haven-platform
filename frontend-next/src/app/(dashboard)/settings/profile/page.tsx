"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components";
import { useSession } from "@/auth/use-session";

export default function SettingsProfilePage() {
  const { user } = useSession();
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

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
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          <Link className="button button-secondary" href="/settings/account">
            Manage account
          </Link>
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

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="field">
              <span>First name</span>
              <input
                onChange={(event) => setFirstName(event.target.value)}
                value={firstName}
              />
            </label>

            <label className="field">
              <span>Last name</span>
              <input
                onChange={(event) => setLastName(event.target.value)}
                value={lastName}
              />
            </label>

            <label className="field">
              <span>Date of birth</span>
              <input
                onChange={(event) => setDateOfBirth(event.target.value)}
                type="date"
                value={dateOfBirth}
              />
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
          </div>
        </form>
      </section>
    </div>
  );
}
