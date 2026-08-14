import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import { normalizePostalCode } from "@/lib/specialists/geography";
import { HOMEPAGE_DATA_REVALIDATE_SECONDS } from "@/lib/homepage/constants";
import {
  buildStarMapSummary,
  toPublicStarMapSummary,
} from "@/lib/starMap/aggregateStarMapCities";
import type {
  StarMapSpecialistInput,
  PostalCodeLookup,
} from "@/lib/starMap/aggregateStarMapCities.types";
import type { StarMapSummary } from "@/lib/starMap/types";

const EMPTY_STAR_MAP: StarMapSummary = {
  total: 0,
  cities: [],
  eligibleCount: 0,
  representedCount: 0,
  missingCoordinatesCount: 0,
};

type SpecialistRow = {
  lat: number | null;
  lng: number | null;
  postal_code: string | null;
  published_at: string | null;
  created_at: string | null;
  specialist_profiles:
    | { city: string | null }
    | { city: string | null }[]
    | null;
};

function profileCity(row: SpecialistRow): string | null {
  const raw = row.specialist_profiles;
  if (!raw) return null;
  if (Array.isArray(raw)) return raw[0]?.city ?? null;
  return raw.city ?? null;
}

function mapTimestamp(row: SpecialistRow): string | null {
  return row.published_at ?? row.created_at ?? null;
}

async function fetchStarMapDataUncached(): Promise<StarMapSummary> {
  let supabase;
  try {
    supabase = createSupabaseServerClient();
  } catch (error) {
    console.error("[homepage/fetchStarMapData] supabase unavailable", error);
    return EMPTY_STAR_MAP;
  }

  const { data, error } = await supabase
    .from("specialists")
    .select(
      "lat, lng, postal_code, published_at, created_at, specialist_profiles(city)",
    )
    .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
    .eq("is_active", true)
    .eq("is_visible", true)
    .eq("billing_visibility_blocked", false)
    .or("is_test.is.null,is_test.eq.false");

  if (error) {
    console.error("[homepage/fetchStarMapData] query failed", error.message);
    return EMPTY_STAR_MAP;
  }

  const rows = (data ?? []) as SpecialistRow[];
  const inputs: StarMapSpecialistInput[] = rows.map((row) => ({
    lat: typeof row.lat === "number" ? row.lat : null,
    lng: typeof row.lng === "number" ? row.lng : null,
    city: profileCity(row),
    postalCode: normalizePostalCode(row.postal_code),
    mapTimestamp: mapTimestamp(row),
  }));

  const plzCodes = Array.from(
    new Set(
      inputs
        .map((row) => row.postalCode)
        .filter((code): code is string => typeof code === "string" && code.length > 0),
    ),
  );

  let plzLookups: PostalCodeLookup[] = [];
  if (plzCodes.length > 0) {
    const { data: plzRows, error: plzError } = await supabase
      .from("postal_codes")
      .select("postal_code, lat, lng, city")
      .in("postal_code", plzCodes);

    if (plzError) {
      console.error("[homepage/fetchStarMapData] postal_codes lookup failed", plzError.message);
    } else {
      plzLookups = (plzRows ?? []) as PostalCodeLookup[];
    }
  }

  return toPublicStarMapSummary(buildStarMapSummary(inputs, plzLookups));
}

export const fetchStarMapDataCached = unstable_cache(
  fetchStarMapDataUncached,
  ["homepage-star-map-summary"],
  { revalidate: HOMEPAGE_DATA_REVALIDATE_SECONDS },
);

export async function fetchStarMapData(): Promise<StarMapSummary> {
  return fetchStarMapDataCached();
}
