"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

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
      <section className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200/80 pb-5">
        <div className="grid max-w-4xl gap-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-amber-700/85">Settings / profile</p>
          <h1 className="text-[clamp(1.8rem,2.25vw,2.4rem)] font-semibold tracking-tight text-slate-900">
            Profile
          </h1>
          <p className="max-w-[72ch] text-sm text-slate-600">
            View and update your basic profile details.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            href="/settings/account"
          >
            Manage account
          </Link>
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
        <div className="mb-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="m-0 text-lg font-semibold tracking-tight text-slate-900">{fullName}</h3>
            <p className="text-sm text-slate-500">@{user.username}</p>
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

          {saveMessage ? (
            <p className="text-sm text-emerald-700">{saveMessage}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#16335f] to-[#27497d] px-4 py-2.5 font-semibold text-white shadow-[0_10px_24px_rgba(22,51,95,0.18)] transition hover:-translate-y-px hover:from-[#102748] hover:to-[#1e3f6e]"
              type="submit"
            >
              Save profile
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
