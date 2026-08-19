/** Known garbled public slugs → persisted canonical `specialists.slug`. Exact keys only. */
export const LEGACY_SPECIALIST_SLUGS: Record<string, string> = {
  "zkeiy-lbztieh": "cosmetologists-kassel-irina-melnik",
  "nhliy-oyimbzeae": "psychologists-oksana-pantelidi",
  "mymyzth-sbtbih": "business-kirchhundem-natalya-sheshenya",
};

export function mapLegacySpecialistSlug(identifier: string): string | null {
  return LEGACY_SPECIALIST_SLUGS[identifier] ?? null;
}
