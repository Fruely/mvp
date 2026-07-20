import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GERMANY_COUNTRY_CODE,
  areValidCoordinates,
  extractCityFromNominatimAddress,
  normalizePostalCode,
  type NormalizedSpecialistLocation,
} from "@/lib/specialists/geography";

export type PostalLocationCandidate = {
  city: string;
  lat: number;
  lng: number;
};

export type ResolvePostalLocationResult =
  | {
      ok: true;
      location: NormalizedSpecialistLocation;
      source: "postal_codes+nominatim" | "nominatim" | "postal_codes";
      candidates: PostalLocationCandidate[];
    }
  | { ok: false; reason: "invalid_postal_code" | "not_found" | "geocode_failed" };

type NominatimHit = {
  lat?: string;
  lon?: string;
  address?: Record<string, unknown>;
};

async function geocodeGermanPlzViaNominatim(
  postalCode: string
): Promise<PostalLocationCandidate[]> {
  const url =
    `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postalCode)}` +
    `&country=Germany&format=json&addressdetails=1&limit=5`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Freuly-App" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimHit[];
    if (!Array.isArray(data)) return [];
    const out: PostalLocationCandidate[] = [];
    const seen = new Set<string>();
    for (const hit of data) {
      if (!hit?.lat || !hit?.lon) continue;
      const lat = parseFloat(hit.lat);
      const lng = parseFloat(hit.lon);
      if (!areValidCoordinates(lat, lng, { countryCode: GERMANY_COUNTRY_CODE })) continue;
      const city = extractCityFromNominatimAddress(hit.address ?? null)?.trim();
      if (!city) continue;
      const key = city.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ city, lat, lng });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Resolve DE postal code → country + city + lat/lng.
 * Priority: postal_codes coords (if any) + Nominatim city; else full Nominatim.
 * Arbitrary user city text is never treated as geo source.
 */
export async function resolveGermanPostalLocation(
  supabase: SupabaseClient,
  rawPostalCode: string
): Promise<ResolvePostalLocationResult> {
  const postalCode = normalizePostalCode(rawPostalCode);
  if (!postalCode) return { ok: false, reason: "invalid_postal_code" };

  let lat: number | null = null;
  let lng: number | null = null;
  let fromTable = false;

  const { data: plzRow, error: plzError } = await supabase
    .from("postal_codes")
    .select("postal_code, lat, lng")
    .eq("postal_code", postalCode)
    .maybeSingle();

  if (plzError) {
    console.error("[resolveGermanPostalLocation] postal_codes lookup failed", plzError.message);
  } else if (
    plzRow &&
    areValidCoordinates(plzRow.lat, plzRow.lng, { countryCode: GERMANY_COUNTRY_CODE })
  ) {
    lat = plzRow.lat as number;
    lng = plzRow.lng as number;
    fromTable = true;
  }

  const nominatimHits = await geocodeGermanPlzViaNominatim(postalCode);
  if (nominatimHits.length === 0 && !fromTable) {
    return { ok: false, reason: "not_found" };
  }

  const candidates: PostalLocationCandidate[] = [];

  async function canonicalizeCity(raw: string): Promise<string> {
    const { data: cityRow } = await supabase
      .from("cities")
      .select("name")
      .ilike("name", raw)
      .eq("is_active", true)
      .maybeSingle();
    if (cityRow?.name && typeof cityRow.name === "string" && cityRow.name.trim()) {
      return cityRow.name.trim();
    }
    return raw.trim();
  }

  for (const hit of nominatimHits) {
    const cityName = await canonicalizeCity(hit.city);
    const useLat = fromTable && lat != null ? lat : hit.lat;
    const useLng = fromTable && lng != null ? lng : hit.lng;
    if (!areValidCoordinates(useLat, useLng, { countryCode: GERMANY_COUNTRY_CODE })) continue;
    if (candidates.some((c) => c.city.toLowerCase() === cityName.toLowerCase())) continue;
    candidates.push({ city: cityName, lat: useLat as number, lng: useLng as number });
  }

  if (candidates.length === 0 && fromTable && areValidCoordinates(lat, lng, { countryCode: GERMANY_COUNTRY_CODE })) {
    // Table coords only — city still required from Nominatim; fail soft if missing.
    return { ok: false, reason: "geocode_failed" };
  }

  if (candidates.length === 0) {
    return { ok: false, reason: "geocode_failed" };
  }

  const primary = candidates[0];

  return {
    ok: true,
    location: {
      countryCode: GERMANY_COUNTRY_CODE,
      postalCode,
      city: primary.city,
      lat: primary.lat,
      lng: primary.lng,
    },
    source:
      fromTable && nominatimHits.length > 0
        ? "postal_codes+nominatim"
        : fromTable
          ? "postal_codes"
          : "nominatim",
    candidates,
  };
}
