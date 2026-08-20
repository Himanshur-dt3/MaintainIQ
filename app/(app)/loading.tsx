export default function AuthenticatedLoading() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="space-y-6"
    >
      <span className="sr-only">Loading workspace…</span>
      <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
      <div className="h-10 w-80 max-w-full animate-pulse rounded bg-slate-200" />
      <div className="h-20 max-w-2xl animate-pulse rounded bg-slate-200" />
      <div className="h-40 animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}
