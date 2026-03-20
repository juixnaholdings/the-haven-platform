import { formatApiErrors, isApiError } from "../api/errors";

interface ErrorAlertProps {
  error: unknown;
  fallbackMessage?: string;
}

export function ErrorAlert({ error, fallbackMessage = "Something went wrong." }: ErrorAlertProps) {
  if (!error) {
    return null;
  }

  const details = formatApiErrors(error);
  const message = isApiError(error) ? error.message : fallbackMessage;

  return (
    <div className="alert alert-error" role="alert">
      <strong>{message}</strong>
      {details.length > 0 ? (
        <ul className="alert-list">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
