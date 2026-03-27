interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        {eyebrow ? <p className="app-eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {description ? <p className="muted-text">{description}</p> : null}
      </div>
    </header>
  );
}
