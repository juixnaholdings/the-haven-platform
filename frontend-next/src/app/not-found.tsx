export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-8">
      <section className="grid place-items-center gap-3 text-center">
        <span
          aria-hidden="true"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-100"
        >
          ?
        </span>
        <p className="m-0 text-sm font-medium text-slate-700">This page is not available.</p>
        <p className="m-0 text-xs text-slate-500">Please try again or reload.</p>
        <p className="m-0 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
          Status 404
        </p>
      </section>
    </main>
  );
}
