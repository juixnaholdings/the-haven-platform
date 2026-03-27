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
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>{title}</h3>
          {description ? <p className="muted-text">{description}</p> : null}
        </div>
        {actions ? <div className="panel-actions">{actions}</div> : null}
      </div>
      <div className="form-section-body">{children}</div>
    </section>
  );
}
