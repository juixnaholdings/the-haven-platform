type StatusTone = "success" | "muted" | "warning" | "danger" | "info";

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
}

export function StatusBadge({ label, tone = "muted" }: StatusBadgeProps) {
  const toneClassName =
    tone === "success"
      ? "status-badge-success"
      : tone === "warning"
        ? "status-badge-warning"
        : tone === "danger"
          ? "status-badge-danger"
          : tone === "info"
            ? "status-badge-info"
            : "status-badge-muted";

  return <span className={`status-badge ${toneClassName}`}>{label}</span>;
}
