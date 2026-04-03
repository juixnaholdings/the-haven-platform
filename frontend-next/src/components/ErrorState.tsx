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
    <section className="grid min-h-[38vh] place-items-center px-4 py-10">
      <article className="grid w-full max-w-2xl gap-5 rounded-3xl border border-red-200/80 bg-red-50/70 p-8 shadow-sm">
        <div
          aria-hidden="true"
          className="grid h-12 w-12 place-items-center rounded-2xl bg-red-100 text-lg font-bold text-red-700"
        >
          !
        </div>
        <div className="space-y-2">
          <h3 className="m-0 text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
          <p className="m-0 text-sm leading-6 text-slate-600">{fallbackMessage}</p>
        </div>
        {onRetry ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <button className="button button-primary" onClick={onRetry} type="button">
              Try again
            </button>
          </div>
        ) : null}
      </article>
    </section>
  );
}
