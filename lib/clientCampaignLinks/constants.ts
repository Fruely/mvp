import type { Lang } from "@/lib/i18n";

export const CLIENT_CAMPAIGN_UI_LANGS = ["ru", "ua", "de"] as const;
export type ClientCampaignUiLang = (typeof CLIENT_CAMPAIGN_UI_LANGS)[number];

export const CLIENT_CAMPAIGN_WORK_FORMATS = ["online", "offline", "hybrid"] as const;
export type ClientCampaignWorkFormat = (typeof CLIENT_CAMPAIGN_WORK_FORMATS)[number];

export const CLIENT_CAMPAIGN_SOURCES = [
  "facebook",
  "instagram",
  "meta_ads",
  "telegram",
  "google_ads",
  "offline",
  "other",
] as const;
export type ClientCampaignSource = (typeof CLIENT_CAMPAIGN_SOURCES)[number];

export const CLIENT_CAMPAIGN_PUBLIC_PATH_PREFIX = "/go";

export function isClientCampaignUiLang(value: string): value is ClientCampaignUiLang {
  return (CLIENT_CAMPAIGN_UI_LANGS as readonly string[]).includes(value);
}

export function isClientCampaignWorkFormat(value: string): value is ClientCampaignWorkFormat {
  return (CLIENT_CAMPAIGN_WORK_FORMATS as readonly string[]).includes(value);
}

export function isClientCampaignSource(value: string): value is ClientCampaignSource {
  return (CLIENT_CAMPAIGN_SOURCES as readonly string[]).includes(value);
}

/** Map stored preferred language to request form Lang (uk → ua). */
export function campaignPreferredLanguageToFormLang(value: string | null | undefined): Lang | null {
  if (!value?.trim()) return null;
  const lower = value.trim().toLowerCase();
  if (lower === "uk" || lower === "ua") return "ua";
  if (lower === "ru") return "ru";
  if (lower === "de") return "de";
  return null;
}
