import type { ReactNode } from "react";

interface DetailItem {
  label: string;
  value: ReactNode;
}

interface DetailPanelProps {
  title: string;
  description?: ReactNode;
  items: DetailItem[];
  columns?: 2 | 3;
  footer?: ReactNode;
}

export function DetailPanel({
  title,
  description,
  items,
  columns = 2,
  footer,
}: DetailPanelProps) {
  const gridColumnsClassName = columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2";

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
      <div className="section-header">
        <div>
          <h3 className="m-0 text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
          {description ? <p className="mt-1 max-w-[72ch] text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
      </div>
      <dl className={`grid gap-3.5 sm:grid-cols-1 ${gridColumnsClassName}`}>
        {items.map((item) => (
          <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4" key={item.label}>
            <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
              {item.label}
            </dt>
            <dd className="mt-2 text-sm font-semibold leading-6 text-slate-900">{item.value}</dd>
          </div>
        ))}
      </dl>
      {footer ? <div className="mt-4 flex flex-wrap items-center gap-2.5">{footer}</div> : null}
    </section>
  );
}
