/**
 * Maps a route/UI language code to the legacy category field key used by `getCategoryTitle`
 * (`title_ru`, `title_de`, `title_ua`). Ukrainian route locale is `ua`; `uk` is normalized to `ua`.
 */
export function toCategoryTitleLang(lang: string): string {
  if (lang === "uk") return "ua";
  return lang;
}
