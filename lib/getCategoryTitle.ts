export function getCategoryTitle(category: any, lang: string): string {
  if (!category) return "";

  if (lang === "ru") return category.title_ru || category.title;
  if (lang === "ua") return category.title_ua || category.title;
  if (lang === "de") return category.title_de || category.title;

  return category.title;
}
