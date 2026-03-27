import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-shell">
      <section className="not-found-card">
        <p className="auth-eyebrow">Route not found</p>
        <h1>This route is not part of Milestone 0.</h1>
        <p className="auth-subtitle">
          The migration scaffold currently includes login and dashboard starter
          routes only.
        </p>
        <div className="error-actions">
          <Link className="button-primary" href="/dashboard">
            Open dashboard scaffold
          </Link>
          <Link className="button-secondary" href="/login">
            Open login scaffold
          </Link>
        </div>
      </section>
    </main>
  );
}
