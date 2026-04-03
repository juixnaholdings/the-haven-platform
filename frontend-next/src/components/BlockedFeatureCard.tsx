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
  const toneClassName =
    tone === "info"
      ? "bg-blue-50/70 text-blue-700 ring-1 ring-blue-200/70"
      : "bg-amber-50/80 text-amber-800 ring-1 ring-amber-200/80";

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
      <div className="section-header">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${toneClassName}`}>
          Not yet available
        </span>
      </div>
      {reason ? <p className="text-sm text-slate-600">{reason}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap items-center gap-2.5">{action}</div> : null}
    </section>
  );
}
