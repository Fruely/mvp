/**
 * Client-safe category resolution from user-typed service text.
 *
 * Uses the same `matchCategoryAsciiSlug` that the server-side redirect uses,
 * but with category rows built from static locale data instead of a DB query.
 * This ensures the wizard generates `category=<slug>` URLs directly, without
 * needing a server roundtrip or a 308 redirect.
 */
import { matchCategoryAsciiSlug, type CategorySlugRow } from "./matchCategoryAsciiSlug";
import { isAsciiSlug } from "@/lib/publicUrls";
import ruLocale from "@/locales/ru.json";
import uaLocale from "@/locales/ua.json";
import deLocale from "@/locales/de.json";

const ruCategories = ruLocale.categories as Record<string, string>;
const uaCategories = uaLocale.categories as Record<string, string>;
const deCategories = deLocale.categories as Record<string, string>;

/** Slugs that must not be resolved from user input. */
const EXCLUDED_SLUGS = new Set([
  "default",
  "other",
  "other-specialization",
]);

let _rows: CategorySlugRow[] | null = null;

function getCategoryRows(): CategorySlugRow[] {
  if (_rows) return _rows;
  const slugs = new Set<string>();
  for (const key of Object.keys(ruCategories)) slugs.add(key);
  for (const key of Object.keys(uaCategories)) slugs.add(key);
  for (const key of Object.keys(deCategories)) slugs.add(key);

  _rows = [];
  Array.from(slugs).forEach((slug) => {
    if (EXCLUDED_SLUGS.has(slug)) return;
    if (!isAsciiSlug(slug)) return;
    _rows!.push({
      slug,
      title: deCategories[slug] ?? null,
      title_ru: ruCategories[slug] ?? null,
      title_ua: uaCategories[slug] ?? null,
      title_de: deCategories[slug] ?? null,
    });
  });
  return _rows;
}

/**
 * Resolve a user-typed service string to a canonical category slug.
 * Returns `null` when the text is free-form (not a known category name).
 *
 * Matching rules (same as server-side `matchCategoryAsciiSlug`):
 *  1. Exact ASCII slug
 *  2. Exact localized title (case-insensitive)
 *  3. Near-match — singular forms ("психолог" → "Психологи")
 */
export function resolveServiceToCategory(service: string): string | null {
  const trimmed = service.trim();
  if (!trimmed) return null;
  return matchCategoryAsciiSlug(trimmed, getCategoryRows());
}
