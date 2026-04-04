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
  actions,
  title,
  meta,
}: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-5 border-b border-slate-200/80 pb-6  mt-3.5">
      <div className="flex-1 w-[60%] gap-2.5">
        {/* {eyebrow ? (
          <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-amber-700/85">
            {eyebrow}
          </p>
        ) : null} */}
        <h2 className="m-0 text-[clamp(1.85rem,2.45vw,2.55rem)] font-semibold leading-tight tracking-tight text-slate-900">
          {title}
        </h2>
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-end justify-start gap-2.5 sm:w-auto sm:justify-end">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
