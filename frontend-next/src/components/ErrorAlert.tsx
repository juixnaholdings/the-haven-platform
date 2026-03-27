import { formatApiErrors } from "@/api/errors";

interface ErrorAlertProps {
  error: unknown;
  fallbackMessage?: string;
}

export function ErrorAlert({
  error,
  fallbackMessage = "Request failed.",
}: ErrorAlertProps) {
  if (!error) {
    return null;
  }

  const details = formatApiErrors(error);

  return (
    <section className="alert alert-error" role="alert">
      <strong>{fallbackMessage}</strong>
      {details.length ? (
        <ul className="alert-list">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
