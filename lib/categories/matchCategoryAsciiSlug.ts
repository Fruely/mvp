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
 * Near-match for singular / abbreviated category name forms.
 * Returns true when the title starts with the query and the length
 * difference is at most {@link MAX_NEAR_TITLE_DIFF} characters.
 *
 * Examples that match:
 *   "психолог" (8) → "психологи" (9)  — diff 1
 *   "коуч"     (4) → "коучи"     (5)  — diff 1
 *   "адвокат"  (7) → "адвокаты"  (8)  — diff 1
 *
 * Requires a minimum query length to avoid overly short prefixes.
 */
const MIN_NEAR_TITLE_QUERY_LENGTH = 4;
const MAX_NEAR_TITLE_DIFF = 2;

function isNearTitleMatch(query: string, title: string | null | undefined): boolean {
  const t = normalizeTitle(title);
  if (!t || !query) return false;
  if (query.length < MIN_NEAR_TITLE_QUERY_LENGTH) return false;
  const diff = t.length - query.length;
  if (diff < 1 || diff > MAX_NEAR_TITLE_DIFF) return false;
  return t.startsWith(query);
}

/**
 * Map a requested category identifier to the canonical ASCII `categories.slug`.
 * Does not invent slugs from titles via transliteration.
 *
 * Matching priority:
 *  1. Exact ASCII slug
 *  2. Public category slug (ASCII conversion)
 *  3. Exact localized title (case-insensitive)
 *  4. Near-match on localized title (singular forms, e.g. "психолог" → "психологи")
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
  if (byTitle) return byTitle.slug;

  // Near-match: singular forms of localized category titles
  const byNearTitle = categories.find((row) => {
    if (!isAsciiSlug(row.slug)) return false;
    return (
      isNearTitleMatch(decoded, row.title) ||
      isNearTitleMatch(decoded, row.title_ru) ||
      isNearTitleMatch(decoded, row.title_ua) ||
      isNearTitleMatch(decoded, row.title_de)
    );
  });
  return byNearTitle?.slug ?? null;
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
