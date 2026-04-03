interface LoadingStateProps {
  title?: string;
  description?: string;
}

export function LoadingState({
  title = "Loading...",
  description = "Please wait while the latest data is loaded.",
}: LoadingStateProps) {
  return (
    <section className="grid min-h-[60vh] place-items-center px-4 py-10">
      <article className="grid w-full max-w-2xl gap-4 rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-sm">
        <div
          aria-hidden="true"
          className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-[#16335f]"
        >
          <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#16335f]/20 border-t-[#16335f]" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600">{description}</p>
        </div>
      </article>
    </section>
  );
}
