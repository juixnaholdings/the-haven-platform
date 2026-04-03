import type { ReactNode } from "react";

interface FilterActionStripProps {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function FilterActionStrip({ search, filters, actions }: FilterActionStripProps) {
  return (
    <section className="grid items-end gap-3 rounded-3xl border border-slate-200/80 bg-[#fcfaf6] p-4 shadow-sm lg:grid-cols-[minmax(240px,1.2fr)_minmax(220px,1fr)_auto]">
      {search ? <div className="grid gap-3">{search}</div> : null}
      {filters ? <div className="grid gap-3 sm:grid-cols-2">{filters}</div> : null}
      {actions ? <div className="flex flex-wrap items-center justify-start gap-2.5 lg:justify-end">{actions}</div> : null}
    </section>
  );
}
