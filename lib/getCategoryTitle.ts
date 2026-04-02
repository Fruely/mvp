export type Category = {
  title?: string | null;
  title_ru?: string | null;
  title_ua?: string | null;
  title_de?: string | null;
};

export function getCategoryTitle(category: Category | null | undefined, lang: string): string {
  if (!category) return "";

  if (lang === "ru") return category.title_ru || category.title || "";
  if (lang === "ua") return category.title_ua || category.title || "";
  if (lang === "de") return category.title_de || category.title || "";

  return category.title || "";
}
