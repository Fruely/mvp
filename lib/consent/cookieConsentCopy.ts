import de from "../../locales/de.json";
import en from "../../locales/en.json";
import ru from "../../locales/ru.json";
import ua from "../../locales/ua.json";
import type { ConsentLang } from "@/lib/consent/cookieConsentLang";

export type CookieConsentCopy = {
  title: string;
  body: string;
  privacyLink: string;
  privacyHref: string;
  acceptAll: string;
  rejectOptional: string;
  settings: string;
  saveSelection: string;
  close: string;
  necessaryTitle: string;
  necessaryDescription: string;
  necessaryAlwaysOn: string;
  analyticsTitle: string;
  analyticsDescription: string;
  marketingTitle: string;
  marketingDescription: string;
  externalMediaTitle: string;
  externalMediaDescription: string;
  settingsAria: string;
};

function asCopy(raw: unknown): CookieConsentCopy {
  const o = (raw ?? {}) as Record<string, unknown>;
  const req = (key: keyof CookieConsentCopy): string => {
    const v = o[key];
    return typeof v === "string" && v.trim() ? v : "";
  };
  return {
    title: req("title"),
    body: req("body"),
    privacyLink: req("privacyLink"),
    privacyHref: req("privacyHref") || "/de/datenschutzerklaerung",
    acceptAll: req("acceptAll"),
    rejectOptional: req("rejectOptional"),
    settings: req("settings"),
    saveSelection: req("saveSelection"),
    close: req("close"),
    necessaryTitle: req("necessaryTitle"),
    necessaryDescription: req("necessaryDescription"),
    necessaryAlwaysOn: req("necessaryAlwaysOn"),
    analyticsTitle: req("analyticsTitle"),
    analyticsDescription: req("analyticsDescription"),
    marketingTitle: req("marketingTitle"),
    marketingDescription: req("marketingDescription"),
    externalMediaTitle: req("externalMediaTitle"),
    externalMediaDescription: req("externalMediaDescription"),
    settingsAria: req("settingsAria"),
  };
}

const BY_LANG: Record<ConsentLang, CookieConsentCopy> = {
  ru: asCopy((ru as { cookieConsent?: unknown }).cookieConsent),
  ua: asCopy((ua as { cookieConsent?: unknown }).cookieConsent),
  de: asCopy((de as { cookieConsent?: unknown }).cookieConsent),
  en: asCopy((en as { cookieConsent?: unknown }).cookieConsent),
};

export function getCookieConsentCopy(lang: ConsentLang): CookieConsentCopy {
  const copy = BY_LANG[lang] ?? BY_LANG.en;
  const enCopy = BY_LANG.en;
  const out = { ...copy };
  for (const key of Object.keys(enCopy) as (keyof CookieConsentCopy)[]) {
    if (!out[key]?.trim()) out[key] = enCopy[key];
  }
  return out;
}

export function listCookieConsentCopyLangs(): ConsentLang[] {
  return (Object.keys(BY_LANG) as ConsentLang[]).filter((lang) => {
    const c = BY_LANG[lang];
    return Boolean(c.title && c.body && c.acceptAll && c.rejectOptional);
  });
}
