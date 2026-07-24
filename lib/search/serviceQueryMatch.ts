/**
 * Pure helpers for the free-text (`q`) specialist search over published
 * services (Phase 2). Deliberately dependency-free so the logic stays
 * node-testable without resolving the `@/` path alias.
 *
 * No scoring here — Phase 2 only fixes recall (do not drop direct matches)
 * and defines a safe description-matching rule to avoid overly broad ILIKE.
 */

/**
 * Minimum length for a single-word (no space) term to be eligible for
 * `description` matching. Long specific tokens (e.g. German compounds like
 * "steuererklärung") are allowed; short broad words ("ремонт", "психолог")
 * are not, so a one-word generic query cannot flood description matches.
 */
export const MIN_DESCRIPTION_SINGLE_WORD_LENGTH = 10;

/** True when a term is safe to match against free-text `description` fields. */
export function isDescriptionEligibleTerm(term: string): boolean {
  const t = typeof term === "string" ? term.trim() : "";
  if (!t) return false;
  if (t.includes(" ")) return true; // multi-word phrase → specific enough
  return t.length >= MIN_DESCRIPTION_SINGLE_WORD_LENGTH;
}

/**
 * Subset of search terms allowed for `description` matching: the normalized
 * query itself (when eligible) plus any eligible expanded terms.
 * Titles use ALL expanded terms; descriptions use only this safe subset.
 */
export function buildDescriptionSearchTerms(
  normalizedQuery: string,
  expandedTerms: readonly string[]
): string[] {
  const out = new Set<string>();
  if (isDescriptionEligibleTerm(normalizedQuery)) out.add(normalizedQuery);
  for (const term of expandedTerms ?? []) {
    if (isDescriptionEligibleTerm(term)) out.add(term);
  }
  return Array.from(out);
}

/**
 * Union of directly matched specialist ids (name / profile / service /
 * translation) with category-derived ids. Direct matches are never dropped,
 * even when the query also matched a category. Order: direct first, then
 * category-derived; duplicates and falsy values removed.
 */
export function mergeQuerySpecialistIds(
  directIds: readonly string[],
  categoryDerivedIds: readonly string[]
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of [...(directIds ?? []), ...(categoryDerivedIds ?? [])]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
