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
    <header className="page-header">
      <div className="page-header-copy">
        {eyebrow ? <p className="app-eyebrow">{eyebrow}</p> : null}
        <h2 className="page-title">{title}</h2>
        {description ? <p className="page-description">{description}</p> : null}
        {meta ? <div className="page-header-meta">{meta}</div> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}
