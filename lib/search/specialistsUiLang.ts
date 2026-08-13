export const SPECIALISTS_UI_LANGS = ["ua", "ru", "de"] as const;
export type SpecialistsUiLang = (typeof SPECIALISTS_UI_LANGS)[number];

export const SPECIALISTS_UI_LANG_HEADER = "x-freuly-ui-lang";

export function isSpecialistsUiLang(value: string | null | undefined): value is SpecialistsUiLang {
  return value === "ua" || value === "ru" || value === "de";
}

/** Query `lang` wins over request header, then cookie. Default RU. */
export function resolveSpecialistsUiLang(input: {
  queryLang?: string | null;
  headerLang?: string | null;
  cookieLang?: string | null;
}): SpecialistsUiLang {
  if (isSpecialistsUiLang(input.queryLang)) return input.queryLang;
  if (isSpecialistsUiLang(input.headerLang)) return input.headerLang;
  if (isSpecialistsUiLang(input.cookieLang)) return input.cookieLang;
  return "ru";
}
