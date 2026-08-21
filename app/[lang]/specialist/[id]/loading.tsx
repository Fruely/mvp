export default function Loading() {
  return (
    <div className="w-full bg-freuly-page px-5 py-8 md:px-20 md:py-12" aria-hidden>
      <div className={`mx-auto w-full max-w-[1280px] animate-pulse space-y-8`}>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-20">
          <div className="order-1 h-[360px] rounded-[20px] bg-freuly-border-subtle md:order-2 md:h-[600px] md:w-[520px] md:shrink-0" />
          <div className="order-2 flex flex-1 flex-col gap-4 md:order-1">
            <div className="h-6 w-32 rounded-full bg-freuly-border-subtle" />
            <div className="h-12 w-3/4 max-w-md rounded bg-freuly-border-subtle" />
            <div className="h-5 w-48 rounded bg-freuly-border-subtle" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-freuly-border-subtle" />
              <div className="h-4 w-5/6 rounded bg-freuly-border-subtle" />
            </div>
            <div className="flex flex-col gap-3 md:flex-row">
              <div className="h-12 w-full rounded-full bg-freuly-border-subtle md:w-64" />
              <div className="h-12 w-full rounded-full bg-freuly-border-subtle md:w-56" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-8 w-64 rounded bg-freuly-border-subtle" />
          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-[220px] rounded-xl bg-freuly-border-subtle" />
            <div className="h-[220px] rounded-xl bg-freuly-border-subtle" />
            <div className="h-[220px] rounded-xl bg-freuly-border-subtle" />
          </div>
        </div>
      </div>
    </div>
  );
}
