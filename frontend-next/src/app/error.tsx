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
    <main className="error-shell">
      <section className="error-card">
        <p className="auth-eyebrow">System fault boundary</p>
        <h1>Something interrupted this view.</h1>
        <p className="auth-subtitle">
          The Next migration scaffold caught a runtime error. You can retry this
          route or return to login.
        </p>
        <div className="error-actions">
          <button className="button-primary" onClick={reset} type="button">
            Retry route
          </button>
          <Link className="button-secondary" href="/login">
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
