interface LoadingStateProps {
  title?: string;
  description?: string;
}

export function LoadingState({
  title = "Loading...",
  description = "Please wait while the latest data is loaded.",
}: LoadingStateProps) {
  return (
    <section className="centered-state">
      <article className="state-card">
        <div className="state-icon" aria-hidden="true">
          <span className="loading-spinner" />
        </div>
        <div className="state-copy">
          <h3>{title}</h3>
          <p className="muted-text">{description}</p>
        </div>
      </article>
    </section>
  );
}
