import type { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}

export function FormSection({
  title,
  description,
  children,
  actions,
}: FormSectionProps) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
      <div className="section-header">
        <div>
          <h3 className="m-0 text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
          {description ? <p className="mt-1 max-w-[72ch] text-sm leading-6 text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
      </div>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}
