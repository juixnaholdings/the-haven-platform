import { SectionCard } from "@/components/layout/section-card";
import { getApiBaseUrl } from "@/lib/config";

const foundationalMetrics = [
  { label: "App Router foundation", value: "Ready" },
  { label: "Route groups", value: "(auth), (dashboard)" },
  { label: "Global providers", value: "Scaffolded" },
  { label: "Backend API target", value: "Configured by env" },
];

const nextMilestoneFocus = [
  "Wire real login/logout/refresh/me against Django endpoints.",
  "Add protected route enforcement in dashboard layout.",
  "Port shared API client semantics from the Vite app.",
];

export default function DashboardPage() {
  const apiBaseUrl = getApiBaseUrl();

  return (
    <section className="dashboard-grid">
      <SectionCard
        eyebrow="Milestone 0"
        title="Next.js migration foundation"
        description="Parallel App Router scaffold prepared for incremental route migration without touching the existing production Vite frontend."
        span={8}
      >
        <ul className="metric-list">
          {foundationalMetrics.map((metric) => (
            <li className="metric-item" key={metric.label}>
              <span className="metric-label">{metric.label}</span>
              <span className="metric-value">{metric.value}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        eyebrow="Environment"
        title="Backend connection target"
        description="Next migration uses an explicit API base URL configuration per environment."
        span={4}
      >
        <ul className="metric-list">
          <li className="metric-item">
            <span className="metric-label">API base URL</span>
            <span className="metric-value">{apiBaseUrl}</span>
          </li>
          <li className="metric-item">
            <span className="metric-label">Runtime source</span>
            <span className="metric-value">NEXT_PUBLIC_API_BASE_URL</span>
          </li>
        </ul>
      </SectionCard>

      <SectionCard
        eyebrow="Milestone 1 preview"
        title="Immediate implementation focus"
        description="These are the next concrete tasks before any domain page migration starts."
        span={12}
      >
        <ul className="milestone-list">
          {nextMilestoneFocus.map((task) => (
            <li className="milestone-item" key={task}>
              <span className="milestone-label">{task}</span>
              <span className="status-chip status-chip-next">Queued</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </section>
  );
}
