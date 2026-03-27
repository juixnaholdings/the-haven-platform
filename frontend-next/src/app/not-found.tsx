import Link from "next/link";

export default function NotFound() {
  return (
    <main className="centered-state">
      <section className="state-card">
        <p className="auth-eyebrow">Route not found</p>
        <h1>This route is not migrated yet.</h1>
        <p className="muted-text">
          Milestone 1 includes login and dashboard parity only in `frontend-next`.
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
