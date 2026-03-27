interface ErrorStateProps {
  title: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <section className="centered-state">
      <article className="state-card state-card-error">
        <div className="state-icon" aria-hidden="true">
          !
        </div>
        <div className="state-copy">
          <h3>{title}</h3>
          <p className="muted-text">{message ?? "An unexpected error occurred."}</p>
        </div>
        {onRetry ? (
          <div className="state-actions">
            <button className="button button-primary" onClick={onRetry} type="button">
              Try again
            </button>
          </div>
        ) : null}
      </article>
    </section>
  );
}
