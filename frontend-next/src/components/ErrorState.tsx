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
    <section className="grid min-h-[60vh] place-items-center px-4 py-10">
      <article className="grid w-full max-w-2xl gap-4 rounded-3xl border border-red-200/80 bg-red-50/70 p-8 shadow-sm">
        <div
          aria-hidden="true"
          className="grid h-12 w-12 place-items-center rounded-2xl bg-red-100 text-lg font-bold text-red-700"
        >
          !
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600">{fallbackMessage}</p>
        </div>
        {onRetry ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              className="inline-flex items-center justify-center rounded-full bg-[#16335f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#102748]"
              onClick={onRetry}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : null}
      </article>
    </section>
  );
}
