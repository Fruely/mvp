/**
 * Locale resolution for cookie-consent UI only.
 * Public site switcher remains ua/ru/de; `en` is prepared for consent fallback.
 */

/** Unknown-user fallback — keep in sync with DEFAULT_LANG in lib/i18n.ts */
const UNKNOWN_USER_LANG = "ru" as const;

export const CONSENT_LANGS = ["ua", "ru", "de", "en"] as const;
export type ConsentLang = (typeof CONSENT_LANGS)[number];

export const FREULY_LANG_COOKIE = "freuly_lang";

export function isConsentLang(value: string): value is ConsentLang {
  return (CONSENT_LANGS as readonly string[]).includes(value);
}

/** Read `freuly_lang` from document.cookie (client only). */
export function readFreulyLangCookie(
  cookieSource: string | null | undefined = typeof document !== "undefined" ? document.cookie : null
): string | null {
  if (!cookieSource) return null;
  const match = cookieSource.match(/(?:^|;\s*)freuly_lang=([^;]*)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function cookieUiLang(
  freulyLangCookie: string | null | undefined,
  fallback: "ua" | "ru" | "de"
): "ua" | "ru" | "de" {
  if (freulyLangCookie === "ua" || freulyLangCookie === "ru" || freulyLangCookie === "de") {
    return freulyLangCookie;
  }
  return fallback;
}

/**
 * Active page locale for consent copy.
 * Prefer URL segment; unprefixed public chrome (`/app`, `/login`, `/specialists`)
 * uses freuly_lang cookie; unsupported paths fall back to English.
 */
export function resolveConsentLang(
  pathname: string | null | undefined,
  freulyLangCookie: string | null | undefined = null
): ConsentLang {
  const path = typeof pathname === "string" && pathname.length > 0 ? pathname : "/";

  if (path === "/datenschutzerklaerung" || path === "/impressum") {
    return "de";
  }

  const seg = path.split("/").filter(Boolean)[0] ?? "";
  if (isConsentLang(seg)) {
    return seg;
  }

  if (path === "/app" || path.startsWith("/app/")) {
    return cookieUiLang(freulyLangCookie, UNKNOWN_USER_LANG);
  }

  if (
    path === "/login" ||
    path.startsWith("/login/") ||
    path === "/specialists" ||
    path.startsWith("/specialists/")
  ) {
    return cookieUiLang(freulyLangCookie, UNKNOWN_USER_LANG);
  }

  return "en";
}
