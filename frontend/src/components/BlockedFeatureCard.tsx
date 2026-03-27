import type { ReactNode } from "react";

interface BlockedFeatureCardProps {
  title: string;
  description: ReactNode;
  reason?: ReactNode;
  action?: ReactNode;
  tone?: "info" | "warning";
}

export function BlockedFeatureCard({
  title,
  description,
  reason,
  action,
  tone = "warning",
}: BlockedFeatureCardProps) {
  return (
    <section className="panel blocked-feature-card">
      <div className="panel-header">
        <div>
          <h3>{title}</h3>
          <p className="muted-text">{description}</p>
        </div>
        <span
          className={
            tone === "info"
              ? "status-badge status-badge-info"
              : "status-badge status-badge-warning"
          }
        >
          Not yet available
        </span>
      </div>
      {reason ? <p className="blocked-feature-reason">{reason}</p> : null}
      {action ? <div className="panel-actions">{action}</div> : null}
    </section>
  );
}
