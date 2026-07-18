import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GERMANY_COUNTRY_CODE,
  areValidCoordinates,
  extractCityFromNominatimAddress,
  normalizePostalCode,
  type NormalizedSpecialistLocation,
} from "@/lib/specialists/geography";

export type ResolvePostalLocationResult =
  | { ok: true; location: NormalizedSpecialistLocation; source: "postal_codes+nominatim" | "nominatim" | "postal_codes" }
  | { ok: false; reason: "invalid_postal_code" | "not_found" | "geocode_failed" };

type NominatimHit = {
  lat?: string;
  lon?: string;
  address?: Record<string, unknown>;
};

async function geocodeGermanPlzViaNominatim(
  postalCode: string
): Promise<{ lat: number; lng: number; city: string | null } | null> {
  const url =
    `https://nominatim.openstreetmap.org/search?postalcode=${encodeURIComponent(postalCode)}` +
    `&country=Germany&format=json&addressdetails=1&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Freuly-App" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimHit[];
    if (!Array.isArray(data) || !data[0]?.lat || !data[0]?.lon) return null;
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (!areValidCoordinates(lat, lng, { countryCode: GERMANY_COUNTRY_CODE })) return null;
    const city = extractCityFromNominatimAddress(data[0].address ?? null);
    return { lat, lng, city };
  } catch {
    return null;
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

  const nominatim = await geocodeGermanPlzViaNominatim(postalCode);
  if (!nominatim && !fromTable) {
    return { ok: false, reason: "not_found" };
  }

  if (nominatim) {
    // Prefer Nominatim coords when table missing; keep table coords if already valid.
    if (!fromTable) {
      lat = nominatim.lat;
      lng = nominatim.lng;
    }
  }

  if (!areValidCoordinates(lat, lng, { countryCode: GERMANY_COUNTRY_CODE })) {
    return { ok: false, reason: "geocode_failed" };
  }

  let city = nominatim?.city?.trim() || null;

  // Optional canonicalize against cities.name (table has no postal_code column in prod).
  if (city) {
    const { data: cityRow } = await supabase
      .from("cities")
      .select("name")
      .ilike("name", city)
      .eq("is_active", true)
      .maybeSingle();
    if (cityRow?.name && typeof cityRow.name === "string" && cityRow.name.trim()) {
      city = cityRow.name.trim();
    }
  }

  if (!city) {
    return { ok: false, reason: "geocode_failed" };
  }

  return {
    ok: true,
    location: {
      countryCode: GERMANY_COUNTRY_CODE,
      postalCode,
      city,
      lat: lat as number,
      lng: lng as number,
    },
    source: fromTable && nominatim ? "postal_codes+nominatim" : fromTable ? "postal_codes" : "nominatim",
  };
}
