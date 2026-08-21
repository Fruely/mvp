/** Canonical full wordmark — Logo_Full_Vector_Freuly.svg */
export const FREULY_LOGO_SRC = "/brand/freuly-logo.svg";

/** Canonical symbol mark — Favicon3_Freuly.svg */
export const FREULY_SYMBOL_SRC = "/brand/freuly-symbol.svg";

/** Intrinsic viewBox ratio (48259.98 / 25399.98). */
export const FREULY_LOGO_ASPECT = 48259.98 / 25399.98;

type FreulyLogoProps = {
  /** Full stacked wordmark (default) or symbol mark for compact placements. */
  variant?: "full" | "symbol";
  className?: string;
  priority?: boolean;
};

/**
 * Canonical Freuly brand logo — vector SVG assets committed under public/brand/.
 * Symbol variant crops the centered F mark from Favicon3's wide Corel canvas via CSS.
 */
export default function FreulyLogo({
  variant = "full",
  className = "h-10 w-auto",
  priority = false,
}: FreulyLogoProps) {
  if (variant === "symbol") {
    return (
      <span className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={FREULY_SYMBOL_SRC}
          alt="Freuly"
          className="absolute left-1/2 top-1/2 h-[1200%] w-auto max-w-none -translate-x-1/2 -translate-y-1/2"
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
        />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={FREULY_LOGO_SRC}
      alt="Freuly"
      className={className}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
