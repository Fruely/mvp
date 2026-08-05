/** Global attribution route — no locale prefix. */
export function partnerReferralPath(code: string): string {
  const trimmed = code.trim();
  return `/r/${trimmed}`;
}

/** Server-side public origin for canonical referral URLs. */
export function resolvePublicSiteOrigin(fallback = ""): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    fallback.trim();
  return fromEnv.replace(/\/$/, "");
}

/** Canonical partner referral URL: `{origin}/r/{code}`. */
export function buildCanonicalReferralUrl(origin: string, code: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${partnerReferralPath(code)}`;
}

/** Client-safe origin when `window` is available. */
export function resolveClientPublicOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  return resolvePublicSiteOrigin();
}
