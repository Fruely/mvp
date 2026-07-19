/**
 * Locale resolution for cookie-consent UI only.
 * Public site switcher remains ua/ru/de; `en` is prepared for consent fallback.
 */

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

/**
 * Active page locale for consent copy.
 * Prefer URL segment; `/app` uses freuly_lang cookie (middleware default ua);
 * unsupported paths fall back to English (never empty i18n keys).
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
    if (freulyLangCookie === "ua" || freulyLangCookie === "ru" || freulyLangCookie === "de") {
      return freulyLangCookie;
    }
    return "ua";
  }

  return "en";
}
