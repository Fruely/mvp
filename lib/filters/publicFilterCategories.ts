import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "../categories/uncategorizedSpecialistCategory";

export type PublicFilterCategoryRecord = {
  slug: string;
  title: string | null;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
  parent_id?: string | null;
};

export type PublicFilterCategoryDto = {
  slug: string;
  title: string | null;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
};

/**
 * Selectable specialization categories for public filter UIs.
 * Child rows only (`parent_id` set); excludes uncategorized catalog slug `other`.
 */
export function selectPublicFilterCategories(
  rows: readonly PublicFilterCategoryRecord[] | null | undefined,
): PublicFilterCategoryDto[] {
  return (rows ?? [])
    .filter(
      (row): row is PublicFilterCategoryRecord & { parent_id: string } =>
        typeof row?.slug === "string" &&
        row.slug.trim().length > 0 &&
        row.slug !== UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG &&
        typeof row.parent_id === "string" &&
        row.parent_id.length > 0,
    )
    .map(({ slug, title, title_ru, title_de, title_ua }) => ({
      slug,
      title: title ?? null,
      title_ru: title_ru ?? null,
      title_de: title_de ?? null,
      title_ua: title_ua ?? null,
    }));
}
