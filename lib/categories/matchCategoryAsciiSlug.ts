import {
  decodePathSegment,
  isAsciiSlug,
  toPublicCategorySlug,
} from "@/lib/publicUrls";

export type CategorySlugRow = {
  slug: string;
  title?: string | null;
  title_ru?: string | null;
  title_ua?: string | null;
  title_de?: string | null;
};

function normalizeTitle(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

/**
 * Map a requested category identifier to the canonical ASCII `categories.slug`.
 * Does not invent slugs from titles via transliteration.
 */
export function matchCategoryAsciiSlug(
  requested: string,
  categories: readonly CategorySlugRow[],
): string | null {
  const decoded = normalizeTitle(decodePathSegment(requested));
  if (!decoded) return null;

  const bySlug = categories.find((row) => isAsciiSlug(row.slug) && row.slug === decoded);
  if (bySlug) return bySlug.slug;

  const ascii = toPublicCategorySlug(requested);
  if (ascii) {
    const exact = categories.find((row) => row.slug === ascii);
    if (exact) return exact.slug;
  }

  const byTitle = categories.find((row) => {
    if (!isAsciiSlug(row.slug)) return false;
    return (
      normalizeTitle(row.title) === decoded ||
      normalizeTitle(row.title_ru) === decoded ||
      normalizeTitle(row.title_ua) === decoded ||
      normalizeTitle(row.title_de) === decoded
    );
  });
  return byTitle?.slug ?? null;
}

/** Direct 308 target. Never returns a non-canonical intermediate path. */
export function legacyCategoryRedirectPath(
  lang: string,
  requestedSlug: string,
  categories: readonly CategorySlugRow[],
): string | null {
  const ascii = matchCategoryAsciiSlug(requestedSlug, categories);
  if (!ascii) return null;
  return `/${lang}/specialists/${ascii}`;
}
