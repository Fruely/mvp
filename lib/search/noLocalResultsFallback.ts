/**
 * Presentation-layer decision for the specialists page `no_local_results` branch.
 *
 * Canonical source: service-search URL encoding in lib/search/serviceSearchUrl.ts
 * - format "nearby" → place + radius (local-first constraint)
 * - format "online" → mode=online (never hits no_local_results with local geo)
 * - format "any" → no place (never hits no_local_results with place)
 *
 * Legacy /search?category&city redirects emit place without radius; online
 * cross-mode fallback may still be appropriate there.
 */
export function shouldOfferOnlineFallbackForNoLocalResults(params: {
  place: string | null | undefined;
  radius: string | null | undefined;
}): boolean {
  const place = params.place?.trim();
  if (!place) return false;
  const radius = params.radius?.trim();
  if (radius) return false;
  return true;
}
