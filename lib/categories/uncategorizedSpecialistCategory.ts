/**
 * Service-only catalog row for specialists without a matching public category.
 * Stored as a root row (`parent_id` null); must be excluded from public category listings.
 */
export const UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG = "other";

/**
 * Public-facing parent row for free-text specialist specialization.
 * Must be excluded from discovery/home taxonomy listings.
 */
export const OTHER_SPECIALIZATION_CATEGORY_SLUG = "other-specialization";

const PUBLIC_DISCOVERY_EXCLUDED_CATEGORY_SLUGS = new Set<string>([
  UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG,
  OTHER_SPECIALIZATION_CATEGORY_SLUG,
]);

export function isExcludedFromPublicCategoryListing(
  slug: string | null | undefined,
): boolean {
  if (typeof slug !== "string") return true;
  const trimmed = slug.trim();
  if (!trimmed) return true;
  return PUBLIC_DISCOVERY_EXCLUDED_CATEGORY_SLUGS.has(trimmed);
}
