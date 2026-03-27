interface LoadingStateProps {
  title: string;
  description?: string;
}

export function LoadingState({
  title,
  description = "Waiting for the backend to return the requested data.",
}: LoadingStateProps) {
  return (
    <div className="state-card">
      <div className="state-icon" aria-hidden="true">
        <div className="loading-spinner" />
      </div>
      <div className="state-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}
