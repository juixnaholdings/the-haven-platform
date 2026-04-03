interface StatCardProps {
  label: string;
  value: string | number;
  info?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "accent" | "success" | "warning";
}

const statToneClassNameMap: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "from-white to-[#faf6ee]",
  accent: "from-[#f6f2ea] to-[#eef3fb]",
  success: "from-[#f1f8f4] to-white",
  warning: "from-[#fff8ed] to-white",
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
      className={`h-full rounded-2xl border border-slate-200/80 bg-gradient-to-b p-5 shadow-sm ${statToneClassNameMap[tone]}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/90 text-slate-500 ring-1 ring-slate-200/80">
          {icon ?? <span className="h-2.5 w-2.5 rounded-full bg-[#16335f]/70" />}
        </div>
        {info ? <div className="text-xs text-slate-500">{info}</div> : null}
      </div>

      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <strong className="mt-2 block text-2xl font-semibold leading-tight text-slate-900">{value}</strong>
    </article>
  );
}
