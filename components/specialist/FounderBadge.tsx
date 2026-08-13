/**
 * Real founder-cohort badge. Presentation matches Language A / public profile Figma.
 */
export default function FounderBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-full border border-freuly-primary/20 bg-freuly-primary-light px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.5px] text-freuly-primary sm:text-[12px] " +
        className
      }
    >
      FREULY FIRST 50
    </span>
  );
}
