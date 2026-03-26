import { ErrorAlert } from "./ErrorAlert";

interface ErrorStateProps {
  title: string;
  description?: string;
  error: unknown;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title,
  description = "The page could not be loaded with the current backend response.",
  error,
  retryLabel = "Try again",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="state-card state-card-error">
      <div className="state-copy">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <ErrorAlert error={error} fallbackMessage={description} />
      {onRetry ? (
        <div className="state-actions">
          <button className="button button-secondary" onClick={onRetry} type="button">
            {retryLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
