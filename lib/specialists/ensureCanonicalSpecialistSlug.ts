import type { SupabaseClient } from "@supabase/supabase-js";

import { isAsciiSlug } from "@/lib/publicUrls";
import { buildSpecialistSlug } from "@/lib/slugify";
import { proposeMigratedCanonicalSlug, uniqueAsciiSlug } from "@/lib/specialists/canonicalSlug";
import { mapLegacySpecialistSlug } from "@/lib/specialists/legacySlugs";

export type CanonicalSlugResolution =
  | { ok: true; slug: string; slugLegacy: string | null; changed: boolean }
  | { ok: false; reason: string };

/**
 * True only when the stored slug is a valid persisted canonical that
 * should remain as-is. Known garbled aliases (in LEGACY_SPECIALIST_SLUGS
 * keys) are ASCII but NOT canonical.
 */
export function isStoredSlugCanonical(slug: string | null | undefined): boolean {
  if (typeof slug !== "string") return false;
  const trimmed = slug.trim();
  if (!trimmed) return false;
  if (!isAsciiSlug(trimmed)) return false;
  if (mapLegacySpecialistSlug(trimmed) !== null) return false;
  return true;
}

/**
 * Resolve what the canonical slug SHOULD be for a specialist before publish.
 * Does not write to the DB — returns data for the caller to include in their
 * atomic update.
 *
 * - If stored slug is already canonical: returns it unchanged.
 * - If stored slug is garbled/non-ASCII/null: computes a new canonical slug
 *   with collision handling, and returns the old value as slugLegacy.
 * - Returns `ok: false` when a canonical slug cannot be generated.
 */
export async function resolveCanonicalSlugForPublish(
  service: SupabaseClient,
  specialistId: string,
  specialist: { slug: string | null; name: string | null; category_id: string | null },
): Promise<CanonicalSlugResolution> {
  const storedSlug = typeof specialist.slug === "string" ? specialist.slug.trim() : "";

  if (isStoredSlugCanonical(storedSlug)) {
    return { ok: true, slug: storedSlug, slugLegacy: null, changed: false };
  }

  const slugLegacy = storedSlug || null;

  // For known garbled aliases, prefer the mapped canonical as base
  const mappedCanonical = storedSlug ? mapLegacySpecialistSlug(storedSlug) : null;

  let base: string;
  if (mappedCanonical) {
    base = mappedCanonical;
  } else {
    let categorySlug: string | null = null;
    if (specialist.category_id) {
      const { data: cat } = await service
        .from("categories")
        .select("slug")
        .eq("id", specialist.category_id)
        .maybeSingle();
      categorySlug = cat?.slug ?? null;
    }

    let citySlug: string | null = null;
    const { data: profile } = await service
      .from("specialist_profiles")
      .select("city")
      .eq("specialist_id", specialistId)
      .maybeSingle();
    if (profile?.city) {
      const { data: cityRow } = await service
        .from("cities")
        .select("slug")
        .ilike("name", profile.city)
        .eq("is_active", true)
        .maybeSingle();
      citySlug = cityRow?.slug ?? null;
    }

    base =
      (storedSlug ? proposeMigratedCanonicalSlug(storedSlug, []) : null) ||
      (specialist.name ? buildSpecialistSlug(categorySlug, citySlug, specialist.name) : "");
  }

  if (!isAsciiSlug(base)) {
    return { ok: false, reason: "slug_generation_failed" };
  }

  const taken = new Set<string>();
  let candidate = uniqueAsciiSlug(base, taken);
  while (true) {
    const { data: existing } = await service
      .from("specialists")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!existing || existing.id === specialistId) break;
    taken.add(candidate);
    candidate = uniqueAsciiSlug(base, taken);
  }

  return { ok: true, slug: candidate, slugLegacy, changed: true };
}

/**
 * Ensure a specialist has a canonical slug persisted BEFORE becoming public.
 * Used by admin paths that bypass publishSpecialistProfile().
 * Writes slug (and slug_legacy) directly if the current value is not canonical.
 * Returns the canonical slug or an error.
 */
export async function ensureCanonicalSpecialistSlug(
  service: SupabaseClient,
  specialistId: string,
): Promise<CanonicalSlugResolution> {
  const { data: row, error } = await service
    .from("specialists")
    .select("id, slug, name, category_id")
    .eq("id", specialistId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, reason: "specialist_not_found" };
  }

  const resolution = await resolveCanonicalSlugForPublish(service, specialistId, {
    slug: row.slug ?? null,
    name: row.name ?? null,
    category_id: row.category_id ?? null,
  });

  if (!resolution.ok) return resolution;
  if (!resolution.changed) return resolution;

  const patch: Record<string, unknown> = { slug: resolution.slug };
  if (resolution.slugLegacy && resolution.slugLegacy !== resolution.slug) {
    patch.slug_legacy = resolution.slugLegacy;
  }

  const { error: updateError } = await service
    .from("specialists")
    .update(patch)
    .eq("id", specialistId);

  if (updateError) {
    return { ok: false, reason: "slug_write_failed" };
  }

  return resolution;
}
