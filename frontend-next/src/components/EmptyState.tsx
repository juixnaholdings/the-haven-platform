import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="state-card state-card-empty">
      <div className="state-icon" aria-hidden="true">
        ○
      </div>
      <div className="state-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {action ? <div className="state-actions">{action}</div> : null}
    </div>
  );
}
