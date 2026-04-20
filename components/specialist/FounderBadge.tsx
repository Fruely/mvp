/**
 * “Freuly First 50” — premium gold pill for founder cohort specialists.
 */
export default function FounderBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border border-amber-300/70 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-100/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-950 shadow-sm ring-1 ring-amber-900/10 " +
        className
      }
    >
      Freuly First 50
    </span>
  );
}
