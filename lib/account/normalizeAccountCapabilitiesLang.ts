import { toCategoryTitleLang } from "../i18n/toCategoryTitleLang.ts";

export type AccountCapabilitiesLang = "ru" | "ua" | "de";

export const DEFAULT_ACCOUNT_CAPABILITIES_LANG: AccountCapabilitiesLang = "ru";

/** Normalize Native/UI locale for account capability category labels. */
export function normalizeAccountCapabilitiesLang(
  lang: string | null | undefined,
): AccountCapabilitiesLang {
  if (lang == null || typeof lang !== "string") {
    return DEFAULT_ACCOUNT_CAPABILITIES_LANG;
  }

  const trimmed = lang.trim().toLowerCase();
  if (!trimmed) {
    return DEFAULT_ACCOUNT_CAPABILITIES_LANG;
  }

  const categoryLang = toCategoryTitleLang(trimmed);
  if (categoryLang === "ua" || categoryLang === "de" || categoryLang === "ru") {
    return categoryLang;
  }

  return DEFAULT_ACCOUNT_CAPABILITIES_LANG;
}
