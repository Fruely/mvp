import { isAsciiSlug } from "@/lib/publicUrls";
import { toSlug } from "@/lib/slugify";

/**
 * Collision strategy for persisted specialist slugs.
 * First candidate is `base`; then `base-2`, `base-3`, … (matches publishSpecialist).
 */
export function uniqueAsciiSlug(base: string, taken: Iterable<string>): string {
  if (!isAsciiSlug(base)) {
    throw new Error(`uniqueAsciiSlug requires an ASCII kebab slug, got: ${base}`);
  }
  const used = new Set(taken);
  if (!used.has(base)) return base;
  for (let n = 2; n <= 999; n += 1) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error(`Could not allocate unique slug for ${base}`);
}

/**
 * Transliteration is allowed only when creating or migrating a stored slug,
 * never as the canonical URL computation on a read path.
 */
export function proposeMigratedCanonicalSlug(
  legacySlug: string,
  taken: Iterable<string> = [],
): string | null {
  const trimmed = legacySlug.trim();
  if (!trimmed) return null;
  const ascii = isAsciiSlug(trimmed) ? trimmed : toSlug(trimmed);
  if (!isAsciiSlug(ascii)) return null;
  return uniqueAsciiSlug(ascii, taken);
}

export function persistedCanonicalSpecialistSlug(
  slug: string | null | undefined,
): string | null {
  if (typeof slug !== "string") return null;
  const trimmed = slug.trim();
  return isAsciiSlug(trimmed) ? trimmed : null;
}
