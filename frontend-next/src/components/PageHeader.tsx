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
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 pb-5">
      <div className="grid max-w-4xl gap-2">
        {eyebrow ? (
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-amber-700/85">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-[clamp(1.8rem,2.4vw,2.5rem)] font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        {meta ? <div className="mt-1 flex flex-wrap items-center gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center justify-end gap-2.5">{actions}</div> : null}
    </header>
  );
}
