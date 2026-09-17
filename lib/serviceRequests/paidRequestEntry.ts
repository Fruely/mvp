import { isSupportedLang, type Lang } from "@/lib/i18n";
import { resolvePublicSiteOrigin } from "@/lib/partners/referralUrl";

export const PAID_REQUEST_LANGS = ["ru", "ua", "de"] as const;

export const PAID_REQUEST_UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type PaidRequestUtmKey = (typeof PAID_REQUEST_UTM_KEYS)[number];

export type PaidRequestUtm = Partial<Record<PaidRequestUtmKey, string | null | undefined>>;

export const PAID_REQUEST_UTM_DEFAULTS: PaidRequestUtm = {
  utm_source: "meta",
  utm_medium: "paid_social",
};

export function paidRequestPath(lang: Lang): `/${Lang}/request` {
  return `/${lang}/request`;
}

export function buildPaidRequestQuery(utm: PaidRequestUtm = {}): string {
  const params = new URLSearchParams();
  for (const key of PAID_REQUEST_UTM_KEYS) {
    const value = typeof utm[key] === "string" ? utm[key].trim() : "";
    if (value) params.set(key, value);
  }
  return params.toString();
}

export function buildPaidRequestPath(lang: string, utm: PaidRequestUtm = {}): string {
  const resolved: Lang = isSupportedLang(lang) ? lang : "ru";
  const query = buildPaidRequestQuery(utm);
  const path = paidRequestPath(resolved);
  return query ? `${path}?${query}` : path;
}

export function buildPaidRequestUrl(
  lang: string,
  utm: PaidRequestUtm = {},
  origin = resolvePublicSiteOrigin("https://freuly.de"),
): string {
  return `${origin.replace(/\/$/, "")}${buildPaidRequestPath(lang, utm)}`;
}
