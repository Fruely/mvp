import ruLocale from "@/locales/ru.json";

export type Category = {
  slug?: string | null;
  title?: string | null;
  title_ru?: string | null;
  title_ua?: string | null;
  title_de?: string | null;
};

const ruCategoryLabels = ruLocale.categories as Record<string, string>;

export function getCategoryTitle(category: Category | null | undefined, lang: string): string {
  if (!category) return "";

  if (lang === "ru") {
    const fromDb = category.title_ru?.trim();
    if (fromDb) return fromDb;
    const slug = typeof category.slug === "string" ? category.slug.trim() : "";
    if (slug && ruCategoryLabels[slug]) return ruCategoryLabels[slug];
    return category.title?.trim() || "";
  }
  if (lang === "ua") return category.title_ua || category.title || "";
  if (lang === "de") return category.title_de || category.title || "";

  return category.title || "";
}
