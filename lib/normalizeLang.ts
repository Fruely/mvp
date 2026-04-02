export function normalizeLang(lang: string): string {
  if (lang === "uk") return "ua";
  return lang;
}
