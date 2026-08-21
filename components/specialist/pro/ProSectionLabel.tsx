type ProSectionLabelProps = {
  children: string;
  className?: string;
  tone?: "primary" | "accent" | "onPrimary";
};

export default function ProSectionLabel({
  children,
  className = "",
  tone = "primary",
}: ProSectionLabelProps) {
  const textClass =
    tone === "onPrimary"
      ? "text-white"
      : tone === "accent"
        ? "text-[#4A5840] md:text-freuly-primary"
        : "text-freuly-primary";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className={`h-px w-5 shrink-0 md:w-6 ${
          tone === "onPrimary" ? "bg-white/60" : "bg-freuly-primary"
        }`}
        aria-hidden
      />
      <span
        className={`text-[11px] font-semibold uppercase tracking-wide md:text-xs ${textClass}`}
      >
        {children}
      </span>
    </div>
  );
}
