"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  void reset;

  useEffect(() => {
    console.error("Unhandled App Router error:", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center px-6 py-8">
      <section className="grid place-items-center gap-3 text-center">
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100"
        >
          !
        </span>
        <p className="m-0 text-sm font-medium text-slate-700">There was an error.</p>
        <p className="m-0 text-xs text-slate-500">Please try again or reload.</p>
        <p className="m-0 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
          Status 500
        </p>
      </section>
    </main>
  );
}
