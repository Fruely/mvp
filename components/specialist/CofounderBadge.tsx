/**
 * Freuly cofounder badge — shown when specialist.is_freuly_cofounder is true.
 */
export default function CofounderBadge({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={
        "inline-flex w-fit items-center rounded-full border border-freuly-primary/20 bg-freuly-primary-light px-2.5 py-1 text-[11px] font-semibold text-freuly-primary sm:text-[12px] " +
        className
      }
    >
      {label}
    </span>
  );
}
