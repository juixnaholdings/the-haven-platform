import Link from "next/link";

export default function NotFound() {
  return (
    <main className="centered-state">
      <section className="state-card">
        <p className="auth-eyebrow">Route not found</p>
        <h1>This route does not exist.</h1>
        <p className="muted-text">
          `frontend-next` now covers the full Phase 1 product route set. This URL is outside that mapped surface.
        </p>
        <div className="state-actions">
          <Link className="button button-primary" href="/dashboard">
            Open dashboard
          </Link>
          <Link className="button button-secondary" href="/login">
            Open login
          </Link>
        </div>
      </section>
    </main>
  );
}
