"use client";

import Link from "next/link";

export default function SettingsSupportPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200/80 pb-5">
        <div className="grid max-w-4xl gap-2">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-amber-700/85">
            Settings / support
          </p>
          <h1 className="text-[clamp(1.8rem,2.25vw,2.4rem)] font-semibold tracking-tight text-slate-900">
            Help &amp; Support
          </h1>
          <p className="max-w-[72ch] text-sm text-slate-600">
            Find quick guidance, account help, and who to contact when you need support.
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
          <h3 className="m-0 text-lg font-semibold tracking-tight text-slate-900">Quick help</h3>
          <p className="mt-1 text-sm text-slate-600">
            Start with these common support destinations.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200/80 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            href="/settings/profile"
          >
            Update profile details
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200/80 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            href="/settings/account"
          >
            Change account credentials
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200/80 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            href="/settings/roles"
          >
            View role assignments
          </Link>
          <a
            className="inline-flex items-center justify-center rounded-full border border-slate-200/80 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            href="mailto:support@thehaven.local"
          >
            Contact support
          </a>
        </div>
      </section>
    </div>
  );
}
