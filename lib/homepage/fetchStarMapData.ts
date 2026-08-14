import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import { normalizePostalCode } from "@/lib/specialists/geography";
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
  id: string;
  lat: number | string | null;
  lng: number | string | null;
  postal_code: string | null;
  published_at: string | null;
  created_at: string | null;
};

function mapTimestamp(row: SpecialistRow): string | null {
  return row.published_at ?? row.created_at ?? null;
}

function asCoord(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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
    .select("id, lat, lng, postal_code, published_at, created_at")
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
  const specialistIds = rows.map((row) => row.id).filter(Boolean);

  const profileCityById = new Map<string, string>();
  if (specialistIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("specialist_profiles")
      .select("specialist_id, city")
      .in("specialist_id", specialistIds);

    if (profilesError) {
      console.error("[homepage/fetchStarMapData] profiles query failed", profilesError.message);
    } else {
      for (const profile of profiles ?? []) {
        if (typeof profile?.specialist_id === "string" && typeof profile.city === "string") {
          const trimmed = profile.city.trim();
          if (trimmed) profileCityById.set(profile.specialist_id, trimmed);
        }
      }
    }
  }

  const inputs: StarMapSpecialistInput[] = rows.map((row) => ({
    lat: asCoord(row.lat),
    lng: asCoord(row.lng),
    city: profileCityById.get(row.id) ?? null,
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
      .select("postal_code, lat, lng")
      .in("postal_code", plzCodes);

    if (plzError) {
      console.error("[homepage/fetchStarMapData] postal_codes lookup failed", plzError.message);
    } else {
      plzLookups = (plzRows ?? []).map((row) => ({
        postal_code: String(row.postal_code),
        lat: asCoord(row.lat),
        lng: asCoord(row.lng),
        city: null,
      }));
    }
  }

  return toPublicStarMapSummary(buildStarMapSummary(inputs, plzLookups));
}

export async function fetchStarMapData(): Promise<StarMapSummary> {
  return fetchStarMapDataUncached();
}
