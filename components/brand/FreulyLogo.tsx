import Image from "next/image";

/** Committed brand wordmark + symbol (1024×1024 PNG, transparent). */
export const FREULY_FULL_LOGO_SRC = "/brand/freuly-full-logo.png";

/** Symbol-only source used for PWA icon generation (1024×1024 PNG). */
export const FREULY_SYMBOL_SRC = "/brand/freuly-symbol-source.png";

type FreulyLogoProps = {
  /** Render full stacked logo (default) or symbol mark only. */
  variant?: "full" | "symbol";
  className?: string;
  priority?: boolean;
};

/**
 * Canonical Freuly brand logo — uses committed assets from `public/brand/`.
 * Do not substitute CSS placeholders or redrawn SVG paths.
 */
export default function FreulyLogo({
  variant = "full",
  className = "h-10 w-auto",
  priority = false,
}: FreulyLogoProps) {
  const src = variant === "symbol" ? FREULY_SYMBOL_SRC : FREULY_FULL_LOGO_SRC;

  return (
    <Image
      src={src}
      alt="Freuly"
      width={1024}
      height={1024}
      className={className}
      priority={priority}
    />
  );
}
