export const SPECIALISTS_UI_LANGS = ["ua", "ru", "de"] as const;
export type SpecialistsUiLang = (typeof SPECIALISTS_UI_LANGS)[number];

export const SPECIALISTS_UI_LANG_HEADER = "x-freuly-ui-lang";

export function isSpecialistsUiLang(value: string | null | undefined): value is SpecialistsUiLang {
  return value === "ua" || value === "ru" || value === "de";
}

/**
 * Map a query/header/cookie value to a UI locale.
 * `uk` is a DB/search code for Ukrainian and must never fall through to default RU.
 */
export function coerceSpecialistsUiLang(
  value: string | null | undefined
): SpecialistsUiLang | null {
  if (value == null || typeof value !== "string") return null;
  const lower = value.trim().toLowerCase();
  if (lower === "ua" || lower === "uk") return "ua";
  if (lower === "ru" || lower === "de") return lower;
  return null;
}

/** Explicit `ui` query wins, then `lang` (including `uk` → `ua`), then header, then cookie. Default RU. */
export function resolveSpecialistsUiLang(input: {
  uiParam?: string | null;
  queryLang?: string | null;
  headerLang?: string | null;
  cookieLang?: string | null;
}): SpecialistsUiLang {
  return (
    coerceSpecialistsUiLang(input.uiParam) ??
    coerceSpecialistsUiLang(input.queryLang) ??
    coerceSpecialistsUiLang(input.headerLang) ??
    coerceSpecialistsUiLang(input.cookieLang) ??
    "ru"
  );
}
