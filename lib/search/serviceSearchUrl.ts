/**
 * Pure URL helpers for the new stepwise service-search flow.
 *
 * Kept framework-free (no React) so the URL/radius logic can be unit-tested
 * without importing the client component. The results page and the flow both
 * rely on the same `radius` query parameter that the backend already parses
 * (see lib/search/specialistSearch.ts → parseUserSearchRadius).
 */

export type ServiceSearchLangValue = "ua" | "ru" | "de";
export type ServiceSearchFormat = "online" | "nearby" | "any";

/**
 * Radii offered in the new UI. Legacy values (5/25) stay valid on the backend
 * for existing rows/URLs but are intentionally not surfaced here.
 *
 * Must stay in sync with PUBLIC_SERVICE_RADII_KM in lib/specialists/geography.ts
 * (enforced by lib/search/serviceSearchUrl.logic.test.mjs). Kept local here so
 * this pure module has no imports and stays node-testable.
 */
export const SERVICE_SEARCH_UI_RADII_KM = [10, 30, 50, 100] as const;
export const DEFAULT_SERVICE_SEARCH_RADIUS_KM = 30;

/** Map UI language value to the DB/search language code (ua → uk). */
export function toSearchLang(value: ServiceSearchLangValue): string {
  return value === "ua" ? "uk" : value;
}

/** True only for radii shown in the new UI (10/30/50/100). */
export function isUiRadiusKm(value: unknown): boolean {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    (SERVICE_SEARCH_UI_RADII_KM as readonly number[]).includes(value)
  );
}

/** Coerce an arbitrary radius to a valid UI radius, falling back to the default. */
export function normalizeUiRadiusKm(value: unknown): number {
  return isUiRadiusKm(value)
    ? (value as number)
    : DEFAULT_SERVICE_SEARCH_RADIUS_KM;
}

/**
 * Build the `/specialists` results URL from the flow selections.
 * `radius` is attached only for the `nearby` format (needs a location).
 */
export function buildServiceSearchResultsUrl(opts: {
  service: string;
  language: ServiceSearchLangValue;
  format: ServiceSearchFormat;
  location: string;
  radiusKm?: number | null;
}): string {
  const params = new URLSearchParams();
  params.set("lang", toSearchLang(opts.language));
  params.set("q", opts.service.trim());

  if (opts.format === "online") {
    params.set("mode", "online");
  } else if (opts.format === "nearby" && opts.location.trim()) {
    params.set("place", opts.location.trim());
    params.set("radius", String(normalizeUiRadiusKm(opts.radiusKm)));
  }

  return `/specialists?${params.toString()}`;
}
