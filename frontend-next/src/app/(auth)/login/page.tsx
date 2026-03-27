import Link from "next/link";

import { getApiBaseUrl, getAppEnvironment } from "@/lib/config";

export default function LoginPage() {
  const apiBaseUrl = getApiBaseUrl();
  const appEnvironment = getAppEnvironment();

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <p className="auth-eyebrow">The Haven</p>
        <h1 className="auth-title">Operations sign in</h1>
        <p className="auth-subtitle">
          Milestone 0 provides the parallel Next.js entry experience and auth
          architecture foundation. Full Django auth wiring is scheduled for
          Milestone 1.
        </p>

        <form className="form-grid">
          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input
              className="form-input"
              id="email"
              name="email"
              placeholder="staff@example.org"
              type="email"
              disabled
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              className="form-input"
              id="password"
              name="password"
              placeholder="••••••••"
              type="password"
              disabled
            />
          </div>
          <p className="form-hint">
            Planned API target: <strong>{apiBaseUrl}</strong> ({appEnvironment})
          </p>
          <div className="button-row">
            <button className="button-primary" type="submit" disabled>
              Sign in (Milestone 1)
            </button>
            <Link className="button-secondary" href="/dashboard">
              Preview dashboard shell
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
