"use client";

import Link from "next/link";
import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Unhandled App Router error:", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-6 py-8">
      <section className="grid w-full max-w-2xl gap-4 rounded-3xl border border-red-200/80 bg-red-50/70 p-8 shadow-sm">
        <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-amber-700/85">
          System fault boundary
        </p>
        <h1 className="m-0 text-3xl font-semibold tracking-tight text-slate-900">
          Something interrupted this view.
        </h1>
        <p className="m-0 text-sm text-slate-600">
          The Next migration route threw an error. Retry this view or return to
          login.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <button
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#16335f] to-[#27497d] px-4 py-2.5 font-semibold text-white shadow-[0_10px_24px_rgba(22,51,95,0.18)] transition hover:-translate-y-px hover:from-[#102748] hover:to-[#1e3f6e]"
            onClick={reset}
            type="button"
          >
            Retry route
          </button>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            href="/login"
          >
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
