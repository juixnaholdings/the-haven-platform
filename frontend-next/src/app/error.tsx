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
    <main className="centered-state">
      <section className="state-card state-card-error">
        <p className="auth-eyebrow">System fault boundary</p>
        <h1>Something interrupted this view.</h1>
        <p className="muted-text">
          The Next migration route threw an error. Retry this view or return to
          login.
        </p>
        <div className="state-actions">
          <button className="button button-primary" onClick={reset} type="button">
            Retry route
          </button>
          <Link className="button button-secondary" href="/login">
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
