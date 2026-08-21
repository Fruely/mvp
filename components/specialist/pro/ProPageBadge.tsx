export default function ProPageBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-freuly-primary/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-freuly-primary ${className}`}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-freuly-primary" />
      Freuly Pro
    </span>
  );
}
