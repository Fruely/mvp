/**
 * Static synonym dictionary for free-text specialist search (no AI).
 * Maps common queries to category slugs and expanded search terms.
 */

import { sanitizeCityFilter as sanitizeSearchToken } from "@/lib/search/placeSearch";

export const MAX_SEARCH_QUERY_LENGTH = 120;
export const MAX_SEARCH_TERMS = 12;

type SynonymGroup = {
  categorySlugs: readonly string[];
  terms: readonly string[];
};

const SYNONYM_GROUPS: readonly SynonymGroup[] = [
  {
    categorySlugs: ["tax-consultants"],
    terms: [
      "налоговый консультант",
      "tax consultant",
      "steuerberater",
      "steuerberatung",
      "налоги",
      "налоговая декларация",
      "декларация",
      "finanzamt",
    ],
  },
  {
    categorySlugs: ["buchfuehrung"],
    terms: [
      "бухгалтер",
      "buchhalter",
      "buchhaltung",
      "accounting",
      "buchführung",
    ],
  },
  {
    categorySlugs: ["it-support"],
    terms: [
      "сайт",
      "сделать сайт",
      "website",
      "webseite",
      "лендинг",
      "landing",
      "web design",
      "вебсайт",
      "сайт под ключ",
    ],
  },
  {
    categorySlugs: ["it-support"],
    terms: [
      "it",
      "it support",
      "computer",
      "laptop",
      "notebook",
      "компьютер",
      "ноутбук",
      "ремонт компьютера",
    ],
  },
  {
    categorySlugs: ["psychologists"],
    terms: [
      "психолог",
      "psychologe",
      "psychologist",
      "тревога",
      "стресс",
      "депрессия",
      "therapy",
    ],
  },
  {
    categorySlugs: ["cosmetologists"],
    terms: [
      "косметолог",
      "kosmetik",
      "kosmetologe",
      "косметика",
      "уход за кожей",
      "skin care",
    ],
  },
];

/** Normalize user query: trim, lowercase, collapse spaces, cap length. */
export function normalizeSearchQuery(value: string | null | undefined): string | null {
  if (value == null || typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ").toLowerCase();
  if (!normalized) return null;
  return normalized.slice(0, MAX_SEARCH_QUERY_LENGTH);
}

/** Sanitize a token before use inside PostgREST `.or()` ilike filters. */
export function sanitizeSearchQueryToken(value: string): string {
  return sanitizeSearchToken(value);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isLatinShortToken(term: string): boolean {
  return term.length <= 3 && /^[a-z0-9]+$/i.test(term);
}

function termMatchesQuery(term: string, query: string): boolean {
  const t = term.toLowerCase().trim();
  if (!t || !query) return false;
  if (query === t) return true;

  if (t.length >= 3 && query.includes(t)) {
    if (isLatinShortToken(t)) {
      return new RegExp(`(?:^|\\s)${escapeRegExp(t)}(?:\\s|$)`).test(query);
    }
    return true;
  }

  if (query.length >= 4 && t.includes(query)) return true;

  return false;
}

/** Synonym groups whose terms match the normalized query. */
export function getMatchedSynonymGroups(normalizedQuery: string): readonly SynonymGroup[] {
  return SYNONYM_GROUPS.filter((group) =>
    group.terms.some((term) => termMatchesQuery(term, normalizedQuery))
  );
}

/** Expand normalized query into text-search terms (full query + matching group terms only). */
export function expandSearchTerms(normalizedQuery: string): string[] {
  const terms = new Set<string>();

  const primary = sanitizeSearchQueryToken(normalizedQuery);
  if (primary) terms.add(primary);

  for (const group of getMatchedSynonymGroups(normalizedQuery)) {
    for (const term of group.terms) {
      if (!termMatchesQuery(term, normalizedQuery)) continue;
      const safe = sanitizeSearchQueryToken(term.toLowerCase());
      if (safe) terms.add(safe);
    }
  }

  return Array.from(terms).slice(0, MAX_SEARCH_TERMS);
}

/** Resolve category slugs implied by synonym groups for the query. */
export function resolveCategorySlugsFromQuery(normalizedQuery: string): string[] {
  const slugs = new Set<string>();
  for (const group of getMatchedSynonymGroups(normalizedQuery)) {
    for (const slug of group.categorySlugs) slugs.add(slug);
  }
  return Array.from(slugs);
}

/** Build PostgREST `.or()` filter for ilike across multiple fields and terms. */
export function buildIlikeOrFilter(
  terms: string[],
  fields: readonly string[]
): string | null {
  const parts: string[] = [];
  for (const term of terms) {
    const safe = sanitizeSearchQueryToken(term);
    if (!safe) continue;
    for (const field of fields) {
      parts.push(`${field}.ilike.%${safe}%`);
    }
  }
  return parts.length > 0 ? parts.join(",") : null;
}
