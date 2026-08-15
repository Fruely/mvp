import Image from "next/image";

/** Original committed brand asset (1024×1024, opaque white padding). */
export const FREULY_FULL_LOGO_SRC = "/brand/freuly-full-logo.png";

/** Tight crop of the full logo with transparent padding removed (600×856). */
export const FREULY_FULL_LOGO_CROPPED_SRC = "/brand/freuly-full-logo-cropped.png";

/** Symbol-only source used for PWA icon generation. */
export const FREULY_SYMBOL_SRC = "/brand/freuly-symbol-source.png";

/** Cropped symbol with transparent padding removed. */
export const FREULY_SYMBOL_CROPPED_SRC = "/brand/freuly-symbol-cropped.png";

/** Visible content bounds after transparent crop of freuly-full-logo.png. */
export const FREULY_FULL_LOGO_CROPPED_WIDTH = 600;
export const FREULY_FULL_LOGO_CROPPED_HEIGHT = 856;

/** Visible content bounds after transparent crop of freuly-symbol-source.png. */
export const FREULY_SYMBOL_CROPPED_WIDTH = 494;
export const FREULY_SYMBOL_CROPPED_HEIGHT = 635;

type FreulyLogoProps = {
  /** Render full stacked logo (default) or symbol mark only. */
  variant?: "full" | "symbol";
  className?: string;
  priority?: boolean;
};

/**
 * Canonical Freuly brand logo — uses cropped committed assets so UI height maps
 * to visible artwork, not opaque padding on the source PNG canvas.
 */
export default function FreulyLogo({
  variant = "full",
  className = "h-10 w-auto",
  priority = false,
}: FreulyLogoProps) {
  const isSymbol = variant === "symbol";
  const src = isSymbol ? FREULY_SYMBOL_CROPPED_SRC : FREULY_FULL_LOGO_CROPPED_SRC;
  const width = isSymbol ? FREULY_SYMBOL_CROPPED_WIDTH : FREULY_FULL_LOGO_CROPPED_WIDTH;
  const height = isSymbol ? FREULY_SYMBOL_CROPPED_HEIGHT : FREULY_FULL_LOGO_CROPPED_HEIGHT;

  return (
    <Image
      src={src}
      alt="Freuly"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}
