import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="grid gap-4 rounded-3xl border border-dashed border-slate-300/80 bg-slate-50/70 p-8">
      <div
        aria-hidden="true"
        className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-200/70 text-sm font-bold text-slate-600"
      >
        ○
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2.5">{action}</div> : null}
    </div>
  );
}
