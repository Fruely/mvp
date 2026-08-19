import { decodePathSegment, isAsciiSlug } from "@/lib/publicUrls";
import { mapLegacySpecialistSlug } from "@/lib/specialists/legacySlugs";
import { persistedCanonicalSpecialistSlug } from "@/lib/specialists/canonicalSlug";

export type SpecialistSlugRow = {
  id: string;
  slug: string | null;
  slug_legacy?: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

export function isSpecialistUuid(identifier: string): boolean {
  return UUID_PATTERN.test(identifier.trim());
}

/**
 * Resolve a public identifier against persisted slug / slug_legacy / known aliases.
 * Deterministic exact matches only — no transliteration scan.
 */
export function matchPublicSpecialist(
  requested: string,
  specialists: readonly SpecialistSlugRow[],
): SpecialistSlugRow | null {
  const decoded = decodePathSegment(requested).trim();
  if (!decoded) return null;

  if (isSpecialistUuid(decoded)) {
    return specialists.find((row) => row.id === decoded) ?? null;
  }

  const byCanonical = specialists.find((row) => row.slug === decoded);
  if (byCanonical) return byCanonical;

  const byLegacy = specialists.find((row) => row.slug_legacy === decoded);
  if (byLegacy) return byLegacy;

  const aliasCanonical = mapLegacySpecialistSlug(decoded);
  if (aliasCanonical) {
    return specialists.find((row) => row.slug === aliasCanonical) ?? null;
  }

  return null;
}

/** One-hop 308 target, or null when the request is already canonical. */
export function specialistCanonicalRedirectPath(
  lang: string,
  requested: string,
  specialist: { id: string; slug: string | null },
): string | null {
  const canonical = persistedCanonicalSpecialistSlug(specialist.slug);
  if (!canonical) return null;
  const decoded = decodePathSegment(requested).trim();
  if (decoded === canonical) return null;
  return `/${lang}/specialist/${canonical}`;
}

export function isPersistedCanonicalSlug(value: string | null | undefined): boolean {
  return isAsciiSlug(value);
}
