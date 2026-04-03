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
    <div className="page-stack">
      <section className="page-header">
        <div className="page-header-copy">
          <p className="app-eyebrow">Settings / profile</p>
          <h1 className="page-title">Profile</h1>
          <p className="page-description">
            View and update your basic profile details.
          </p>
        </div>
        <div className="page-header-actions">
          <Link className="button button-secondary" href="/settings/account">
            Manage account
          </Link>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h3>{fullName}</h3>
            <p className="muted-text">@{user.username}</p>
          </div>
        </div>

        <form className="page-stack" onSubmit={handleSubmit}>
          <div className="form-grid form-grid-2">
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
            <p className="field-feedback field-feedback-success">{saveMessage}</p>
          ) : null}

          <div className="inline-actions">
            <button className="button button-primary" type="submit">
              Save profile
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
