export default function DashboardRouteLoading() {
  return (
    <div className="space-y-freuly-8 animate-pulse" aria-hidden>
      <div className="space-y-2">
        <div className="h-8 w-56 rounded bg-freuly-border-subtle" />
        <div className="h-4 w-80 max-w-full rounded bg-freuly-border-subtle" />
      </div>
      <div className="h-28 rounded-freuly-lg bg-freuly-border-subtle" />
      <div className="grid gap-freuly-6 md:grid-cols-5">
        <div className="h-56 rounded-freuly-lg bg-freuly-border-subtle md:col-span-3" />
        <div className="h-56 rounded-freuly-lg bg-freuly-border-subtle md:col-span-2" />
      </div>
      <div className="h-40 rounded-freuly-lg bg-freuly-border-subtle" />
    </div>
  );
}
