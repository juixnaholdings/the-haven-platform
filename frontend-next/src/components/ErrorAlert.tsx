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
    <section
      className="rounded-2xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      <strong className="font-semibold">{fallbackMessage}</strong>
      {details.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
