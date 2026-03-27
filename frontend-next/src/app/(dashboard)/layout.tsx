import Link from "next/link";

import { DashboardAccessBanner } from "@/auth/dashboard-access-banner";

const migrationRoadmap = [
  { label: "Milestone 0: scaffold + route groups", status: "Complete" },
  { label: "Milestone 1: auth wiring + shell guard", status: "Next" },
  { label: "Milestone 2: members + households migration", status: "Later" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="shell-sidebar">
        <div className="shell-brand">
          <p className="auth-eyebrow">Parallel frontend</p>
          <h1 className="shell-title">The Haven Next</h1>
          <p className="shell-copy">
            App Router migration scaffold running alongside the existing Vite
            application.
          </p>
        </div>

        <nav className="shell-nav" aria-label="Scaffold navigation">
          <Link className="shell-nav-link" href="/dashboard">
            Dashboard scaffold
          </Link>
          <Link className="shell-nav-link" href="/login">
            Login scaffold
          </Link>
          <span className="shell-nav-placeholder">Members migration (planned)</span>
          <span className="shell-nav-placeholder">
            Households migration (planned)
          </span>
          <span className="shell-nav-placeholder">Finance migration (planned)</span>
        </nav>
      </aside>

      <section className="shell-main">
        <header className="shell-topbar">
          <div className="shell-topbar-copy">
            <h1>Migration workspace</h1>
            <p>Milestone 0 keeps production behavior in Vite and adds a clean Next baseline.</p>
          </div>
          <Link className="button-secondary" href="/login">
            Auth route
          </Link>
        </header>

        <DashboardAccessBanner />

        <main className="shell-content">
          {children}
          <section className="section-card section-card-span-12 section-card-mt">
            <div className="section-header">
              <p className="section-eyebrow">Roadmap</p>
              <h2 className="section-title">Long-running branch checkpoints</h2>
            </div>
            <ul className="milestone-list">
              {migrationRoadmap.map((item) => (
                <li className="milestone-item" key={item.label}>
                  <span className="milestone-label">{item.label}</span>
                  <span
                    className={
                      item.status === "Complete"
                        ? "status-chip status-chip-complete"
                        : item.status === "Next"
                          ? "status-chip status-chip-next"
                          : "status-chip status-chip-later"
                    }
                  >
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </section>
    </div>
  );
}
