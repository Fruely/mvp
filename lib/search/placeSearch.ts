/**
 * Place-search helpers for the public specialist search API.
 *
 * Supports both German PLZ (5-digit postal codes) and city names
 * in Latin/Cyrillic via a curated alias map.
 */

import {
  GERMANY_COUNTRY_CODE,
  areValidCoordinates,
} from "@/lib/specialists/geography";

const PLZ_RE = /^\d{5}$/;

export type CityGeocodeResult = {
  lat: number;
  lng: number;
  displayName: string | null;
};

/**
 * Resolve a city name to coordinates via Nominatim (Germany).
 * Used for city → radius RPC search; callers should fall back to ILIKE if null.
 */
export async function geocodeGermanCityViaNominatim(
  city: string
): Promise<CityGeocodeResult | null> {
  const q = city.trim();
  if (!q) return null;

  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}` +
    `&country=Germany&format=json&limit=1`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Freuly-App" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;
    if (!Array.isArray(data) || !data[0]?.lat || !data[0]?.lon) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (!areValidCoordinates(lat, lng, { countryCode: GERMANY_COUNTRY_CODE })) {
      return null;
    }
    return {
      lat,
      lng,
      displayName:
        typeof data[0].display_name === "string" ? data[0].display_name : null,
    };
  } catch {
    return null;
  }
}

/** Canonical city name → lowercase aliases (Latin + Cyrillic). */
const CITY_ALIAS_MAP: Record<string, readonly string[]> = {
  Kassel: ["kassel", "кассель", "касель"],
  "Köln": ["köln", "koeln", "cologne", "кёльн", "кельн"],
  "Düsseldorf": ["düsseldorf", "duesseldorf", "dusseldorf", "дюссельдорф"],
  "München": ["münchen", "muenchen", "munich", "мюнхен"],
  "Nürnberg": ["nürnberg", "nuernberg", "nuremberg", "нюрнберг"],
  Berlin: ["berlin", "берлин"],
  Hamburg: ["hamburg", "гамбург"],
  Dortmund: ["dortmund", "дортмунд"],
  Essen: ["essen", "эссен"],
  Bremen: ["bremen", "бремен"],
  Frankfurt: ["frankfurt", "франкфурт"],
  Stuttgart: ["stuttgart", "штутгарт"],
  Leipzig: ["leipzig", "лейпциг"],
  Dresden: ["dresden", "дрезден"],
  Hannover: ["hannover", "ганновер"],
  Bonn: ["bonn", "бонн"],
  Mannheim: ["mannheim", "мангейм", "маннхайм"],
  Bielefeld: ["bielefeld", "билефельд"],
  Wuppertal: ["wuppertal", "вупперталь"],
  Augsburg: ["augsburg", "аугсбург"],
  Aachen: ["aachen", "ахен"],
  Paderborn: ["paderborn", "падерборн"],
  Wiesbaden: ["wiesbaden", "висбаден"],
};

/** Reverse index: lowercase alias → canonical city name. */
const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(CITY_ALIAS_MAP)) {
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(alias, canonical);
  }
  ALIAS_TO_CANONICAL.set(canonical.toLowerCase(), canonical);
}

export function normalizePlaceInput(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function isPostalCodeLike(value: string): boolean {
  return PLZ_RE.test(value.trim());
}

/**
 * Expand a user-typed place value into a list of canonical city names
 * that should be searched against `specialist_profiles.city`.
 *
 * Returns the canonical German city name(s) if the input matches an alias,
 * otherwise returns the normalized input as-is (for direct ilike matching).
 */
export function expandPlaceAliases(normalizedInput: string): string[] {
  const canonical = ALIAS_TO_CANONICAL.get(normalizedInput);
  if (canonical) return [canonical];
  return [normalizedInput];
}

/**
 * Strip characters that could break PostgREST `.or()` filter syntax.
 * Keeps Latin, Cyrillic, German umlauts/ß, spaces, and hyphens.
 * Returns empty string if nothing valid remains.
 */
const SAFE_CITY_RE =
  /[^a-zA-ZÄÖÜäöüß\u0400-\u04FF\s-]/g;

export function sanitizeCityFilter(value: string): string {
  return value.replace(SAFE_CITY_RE, "").replace(/\s+/g, " ").trim();
}
