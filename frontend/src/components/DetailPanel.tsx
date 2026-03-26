import type { ReactNode } from "react";

interface DetailItem {
  label: string;
  value: ReactNode;
}

interface DetailPanelProps {
  title: string;
  description?: ReactNode;
  items: DetailItem[];
  columns?: 2 | 3;
  footer?: ReactNode;
}

export function DetailPanel({
  title,
  description,
  items,
  columns = 2,
  footer,
}: DetailPanelProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3>{title}</h3>
          {description ? <p className="muted-text">{description}</p> : null}
        </div>
      </div>
      <dl className={`detail-grid detail-grid-${columns}`}>
        {items.map((item) => (
          <div className="detail-item" key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      {footer ? <div className="panel-footer">{footer}</div> : null}
    </section>
  );
}
