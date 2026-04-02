import { isSupportedLang, type Lang } from "@/lib/i18n";

const DEFAULT_LANG: Lang = "ua";

export function specialistDashboardHref(lang?: string | null): string {
  const l = lang && isSupportedLang(lang) ? lang : DEFAULT_LANG;
  return `/${l}/specialist/dashboard`;
}

/** Client-only: uses `freuly_lang` cookie, falls back to ua */
export function specialistDashboardHrefClient(): string {
  if (typeof document === "undefined") {
    return specialistDashboardHref(DEFAULT_LANG);
  }
  const m = document.cookie.match(/(?:^|;\s*)freuly_lang=([^;]+)/);
  const raw = m?.[1] ? decodeURIComponent(m[1]).trim() : "";
  return specialistDashboardHref(raw || undefined);
}
