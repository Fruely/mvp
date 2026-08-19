import type { Lang } from "@/lib/i18n";

/**
 * URL helpers for the installed-PWA app shell.
 *
 * Every link points at an EXISTING Freuly route — the shell is only a new,
 * lighter entry point into the current flow. No new search query parameters are
 * introduced here: category actions and "nearby"/"online" quick actions funnel
 * users into the existing guided `service-search`, exactly as specified.
 */

export function serviceSearchHref(lang: Lang): string {
  return `/${lang}/service-search`;
}

export function categoryHref(lang: Lang, slug: string): string {
  return `/${lang}/specialists/${slug}`;
}

export function homeHref(lang: Lang): string {
  return `/${lang}`;
}

export function dashboardHref(lang: Lang): string {
  return `/${lang}/specialist/dashboard`;
}

export const loginHref = "/login";

/** GET route handler that sets the `freuly_lang` cookie and returns to /app. */
export function languageSwitchHref(lang: Lang): string {
  return `/api/app-language?lang=${lang}`;
}
