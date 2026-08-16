import { isSupportedLang, langFromCookie, type Lang } from "@/lib/i18n";

const LOCALIZED_NEXT_PREFIX = /^\/(ua|ru|de)(\/|$)/;

/**
 * Extract a supported locale from an already-validated internal `next` path.
 * Returns null when the path has no localized prefix.
 */
export function langFromSafeNextPath(safeNext: string | null | undefined): Lang | null {
  if (!safeNext) return null;
  const match = safeNext.match(LOCALIZED_NEXT_PREFIX);
  if (!match?.[1] || !isSupportedLang(match[1])) return null;
  return match[1];
}

/**
 * Resolve login UI + signup metadata locale.
 * When `next` contains a localized prefix (/ru/, /ua/, /de/), prefer it.
 * Otherwise fall back to the freuly_lang cookie (default ru).
 */
export function resolveLoginLang(input: {
  cookieLang: string | null | undefined;
  safeNext: string | null | undefined;
}): Lang {
  return langFromSafeNextPath(input.safeNext) ?? langFromCookie(input.cookieLang);
}
