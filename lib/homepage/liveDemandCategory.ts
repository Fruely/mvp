import { getCategoryTitle, type Category } from "@/lib/getCategoryTitle";
import type { Lang } from "@/lib/i18n";

const CATEGORY_TEXT_MAX = 48;

export function publicCategoryLabel(input: {
  lang: Lang;
  categoryText?: string | null;
  category?: Category | null;
}): string | null {
  const fromCatalog = getCategoryTitle(input.category, input.lang).trim();
  if (fromCatalog) return fromCatalog.slice(0, CATEGORY_TEXT_MAX);

  const fromText = typeof input.categoryText === "string" ? input.categoryText.replace(/\s+/g, " ").trim() : "";
  if (!fromText) return null;
  if (fromText.length <= CATEGORY_TEXT_MAX) return fromText;
  return `${fromText.slice(0, CATEGORY_TEXT_MAX - 1).trimEnd()}…`;
}
