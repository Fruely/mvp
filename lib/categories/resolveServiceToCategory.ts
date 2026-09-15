/**
 * Client-safe category resolution from user-typed service text.
 *
 * Uses the same `matchCategoryAsciiSlug` that the server-side redirect uses,
 * but with category rows built from static locale data instead of a DB query.
 * This ensures the wizard generates `category=<slug>` URLs directly, without
 * needing a server roundtrip or a 308 redirect.
 *
 * It also falls back to the shared free-text synonym dictionary when the
 * phrase maps unambiguously to exactly one category (for example
 * "коучинг" / "coach" / "coaching" -> "coaches"). This keeps the wizard
 * category routing aligned with the server search behavior.
 */
import { matchCategoryAsciiSlug, type CategorySlugRow } from "./matchCategoryAsciiSlug";
import { isAsciiSlug } from "@/lib/publicUrls";
import {
  normalizeSearchQuery,
  resolveCategorySlugsFromQuery,
} from "@/lib/search/searchSynonyms";
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
 * Returns `null` when the text is free-form or maps to multiple categories.
 *
 * Matching rules:
 *  1. Exact ASCII slug
 *  2. Exact localized title (case-insensitive)
 *  3. Near-match — singular forms ("психолог" -> "Психологи")
 *  4. Shared search synonyms when exactly one category is implied
 */
export function resolveServiceToCategory(service: string): string | null {
  const trimmed = service.trim();
  if (!trimmed) return null;

  const directMatch = matchCategoryAsciiSlug(trimmed, getCategoryRows());
  if (directMatch) return directMatch;

  const normalized = normalizeSearchQuery(trimmed);
  if (!normalized) return null;

  const synonymSlugs = resolveCategorySlugsFromQuery(normalized).filter(
    (slug) => !EXCLUDED_SLUGS.has(slug) && isAsciiSlug(slug),
  );
  const uniqueSlugs = Array.from(new Set(synonymSlugs));

  return uniqueSlugs.length === 1 ? uniqueSlugs[0] : null;
}
