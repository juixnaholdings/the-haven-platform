import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-8">
      <section className="grid w-full max-w-2xl gap-4 rounded-3xl border border-slate-200/80 bg-white/95 p-8 shadow-sm">
        <p className="m-0 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-amber-700/85">
          Route not found
        </p>
        <h1 className="m-0 text-3xl font-semibold tracking-tight text-slate-900">
          This route does not exist.
        </h1>
        <p className="m-0 text-sm text-slate-600">
          `frontend-next` now covers the full Phase 1 product route set. This URL is outside that mapped surface.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#16335f] to-[#27497d] px-4 py-2.5 font-semibold text-white shadow-[0_10px_24px_rgba(22,51,95,0.18)] transition hover:-translate-y-px hover:from-[#102748] hover:to-[#1e3f6e]"
            href="/dashboard"
          >
            Open dashboard
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            href="/login"
          >
            Open login
          </Link>
        </div>
      </section>
    </main>
  );
}
