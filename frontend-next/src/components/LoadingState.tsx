interface LoadingStateProps {
  title?: string;
  description?: string;
}

export function LoadingState({
  title = "Loading...",
  description = "Please wait while the latest data is loaded.",
}: LoadingStateProps) {
  void title;
  void description;

  return (
    <section className="grid min-h-[calc(100vh-4rem)] place-items-center px-4 py-6">
      <div className="grid place-items-center gap-3">
        <span
          aria-hidden="true"
          className="h-9 w-9 animate-spin rounded-full border-[3px] border-[#00a6fb]/20 border-t-[#00a6fb]"
        />
        <p className="m-0 text-xs font-medium tracking-[0.08em] text-slate-500">loading ....</p>
      </div>
    </section>
  );
}
