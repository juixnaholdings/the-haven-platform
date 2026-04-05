import { isApiError } from "@/api/errors";

interface ErrorStateProps {
  title: string;
  description?: string;
  error?: unknown;
  message?: string;
  onRetry?: () => void;
}

function getErrorStatusCode(error: unknown): number | null {
  if (isApiError(error) && Number.isInteger(error.statusCode)) {
    return error.statusCode;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number"
  ) {
    return (error as { statusCode: number }).statusCode;
  }

  return null;
}

export function ErrorState({
  title,
  description,
  error,
  message,
  onRetry,
}: ErrorStateProps) {
  void title;
  void description;
  void message;
  void onRetry;

  const statusCode = getErrorStatusCode(error);
  const helperStatusCode = statusCode === 404 ? 404 : 500;

  return (
    <section className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-6">
      <div className="grid place-items-center gap-3 text-center">
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-500 ring-1 ring-red-100"
        >
          !
        </span>
        <p className="m-0 text-sm font-medium text-slate-700">There was an error.</p>
        <p className="m-0 text-xs text-slate-500">Please try again or reload.</p>
        <p className="m-0 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
          Status {helperStatusCode}
        </p>
      </div>
    </section>
  );
}
