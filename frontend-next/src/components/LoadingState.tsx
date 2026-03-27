interface LoadingStateProps {
  title?: string;
}

export function LoadingState({ title = "Loading..." }: LoadingStateProps) {
  return (
    <section className="centered-state">
      <article className="state-card">
        <div className="state-icon" aria-hidden="true">
          <span className="loading-spinner" />
        </div>
        <div className="state-copy">
          <h3>{title}</h3>
          <p className="muted-text">Please wait while the latest data is loaded.</p>
        </div>
      </article>
    </section>
  );
}
