import { DEFAULT_LANG, resolveRouteLang } from "@/lib/i18n";

export function specialistDashboardHref(lang?: string | null): string {
  const l = resolveRouteLang(lang);
  return `/${l}/specialist/dashboard`;
}

/** Client-only: uses `freuly_lang` cookie, falls back to DEFAULT_LANG (`ru`) */
export function specialistDashboardHrefClient(): string {
  if (typeof document === "undefined") {
    return specialistDashboardHref(DEFAULT_LANG);
  }
  const m = document.cookie.match(/(?:^|;\s*)freuly_lang=([^;]+)/);
  const raw = m?.[1] ? decodeURIComponent(m[1]).trim() : "";
  return specialistDashboardHref(raw || undefined);
}
