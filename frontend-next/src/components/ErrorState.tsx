interface ErrorStateProps {
  title: string;
  description?: string;
  error?: unknown;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title,
  description,
  error,
  message,
  onRetry,
}: ErrorStateProps) {
  const fallbackMessage =
    message ??
    description ??
    (error instanceof Error ? error.message : "An unexpected error occurred.");

  return (
    <section className="centered-state centered-state-error">
      <article className="state-card state-card-error">
        <div className="state-icon" aria-hidden="true">
          !
        </div>
        <div className="state-copy">
          <h3>{title}</h3>
          <p className="muted-text">{fallbackMessage}</p>
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
