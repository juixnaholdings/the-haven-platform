interface StatCardProps {
  label: string;
  value: string | number;
  info?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "accent" | "success" | "warning";
}

const statIconToneClassNameMap: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-slate-500",
  accent: "text-[#1f4479]",
  success: "text-emerald-600",
  warning: "text-amber-600",
};

export function StatCard({
  label,
  value,
  info,
  icon,
  tone = "default",
}: StatCardProps) {
  return (
    <article
      className="relative h-full overflow-hidden rounded-2xl border border-slate-200/85 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.1)]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white via-white/70 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 h-24 w-40 rounded-full bg-white/85 blur-2xl"
      />

      <div className="relative z-[1] mb-4 flex items-start justify-between gap-3">
        <div
          className={`grid h-10 w-10 place-items-center rounded-xl bg-white/95 ring-1 ring-slate-200/80 ${statIconToneClassNameMap[tone]}`}
        >
          {icon ?? <span className="h-2.5 w-2.5 rounded-full bg-[#16335f]/70" />}
        </div>
        {info ? <div className="text-xs text-slate-500">{info}</div> : null}
      </div>

      <p className="relative z-[1] text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <strong className="relative z-[1] mt-2 block text-2xl font-semibold leading-tight text-slate-900">{value}</strong>
    </article>
  );
}
