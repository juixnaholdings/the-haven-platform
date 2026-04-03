type StatusTone = "success" | "muted" | "warning" | "danger" | "info";

interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
}

export function StatusBadge({ label, tone = "muted" }: StatusBadgeProps) {
  const toneClassName =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200/80"
      : tone === "warning"
        ? "bg-amber-50 text-amber-800 ring-amber-200/80"
        : tone === "danger"
          ? "bg-red-50 text-red-700 ring-red-200/80"
          : tone === "info"
            ? "bg-blue-50 text-blue-700 ring-blue-200/80"
            : "bg-slate-100 text-slate-600 ring-slate-200/80";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.72rem] font-semibold tracking-[0.02em] ring-1 ${toneClassName}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current/80" />
      {label}
    </span>
  );
}
