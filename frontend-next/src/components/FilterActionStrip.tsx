import type { ReactNode } from "react";

interface FilterActionStripProps {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
}

export function FilterActionStrip({ search, filters, actions }: FilterActionStripProps) {
  return (
    <section className="filter-action-strip">
      {search ? <div className="filter-action-strip-search">{search}</div> : null}
      {filters ? <div className="filter-action-strip-filters">{filters}</div> : null}
      {actions ? <div className="filter-action-strip-actions">{actions}</div> : null}
    </section>
  );
}
