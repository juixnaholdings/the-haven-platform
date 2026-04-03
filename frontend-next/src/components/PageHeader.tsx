import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-200/80 pb-6">
      <div className="grid max-w-4xl gap-2.5">
        {eyebrow ? (
          <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-amber-700/85">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="m-0 text-[clamp(1.85rem,2.45vw,2.55rem)] font-semibold leading-tight tracking-tight text-slate-900">
          {title}
        </h2>
        {description ? (
          <p className="m-0 max-w-[72ch] text-sm leading-6 text-slate-600">{description}</p>
        ) : null}
        {meta ? <div className="mt-0.5 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center justify-end gap-2.5">{actions}</div> : null}
    </header>
  );
}
