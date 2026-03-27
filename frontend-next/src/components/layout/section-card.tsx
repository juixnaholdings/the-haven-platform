import type { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  span?: 4 | 8 | 12;
}

export function SectionCard({
  title,
  eyebrow,
  description,
  children,
  span = 12,
}: SectionCardProps) {
  return (
    <article className={`section-card section-card-span-${span}`}>
      <header className="section-header">
        {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
        <h2 className="section-title">{title}</h2>
        {description ? <p className="section-description">{description}</p> : null}
      </header>
      <div>{children}</div>
    </article>
  );
}
