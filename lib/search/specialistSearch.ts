/**
 * Core specialist search logic — shared by the API route and the SSR page.
 *
 * Calling this helper directly from app/specialists/page.tsx avoids a
 * redundant HTTP roundtrip (page → own API route → Supabase).
 * The API route at app/api/specialists/search/route.ts is a thin wrapper
 * that parses request params and delegates here.
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeSearchLangToDbCode } from "@/lib/i18n/normalizeSearchLangToDbCode";
import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";
import {
  normalizePlaceInput,
  isPostalCodeLike,
  expandPlaceAliases,
  sanitizeCityFilter,
  geocodeGermanCityViaNominatim,
} from "@/lib/search/placeSearch";
import {
  normalizeSearchQuery,
  expandSearchTerms,
  resolveCategorySlugsFromQuery,
  buildIlikeOrFilter,
} from "@/lib/search/searchSynonyms";
import {
  ALLOWED_SERVICE_RADII_KM,
  isAllowedServiceRadiusKm,
  isWithinDualRadius,
  distanceKm,
  normalizeWorkFormat,
  areValidCoordinates,
  type AllowedServiceRadiusKm,
} from "@/lib/specialists/geography";

// ---------------------------------------------------------------------------
// Internal types (not exported; used only in this module)
// ---------------------------------------------------------------------------

type CategoryRow = {
  id: string;
  slug: string;
  title: string | null;
  title_ru: string | null;
  title_de: string | null;
  title_ua: string | null;
};

type SpecialistRow = {
  id: string;
  name: string | null;
  bio: string | null;
  slug: string | null;
  avatar_url: string | null;
  category_id: string | null;
  languages: string[] | null;
  work_format: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  service_radius_km?: number | null;
  distance?: number | null;
};

type QueryMatchResult = {
  specialistIds: Set<string>;
  categoryIds: Set<string>;
};

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SpecialistResult = {
  id: string;
  slug: string | null;
  name: string | null;
  bio: string | null;
  avatar_url: string | null;
  category_id: string | null;
  category_slug: string | null;
  category_title: string | null;
  category_title_ru: string | null;
  category_title_de: string | null;
  category_title_ua: string | null;
  languages: string[];
  work_format: string | null;
  postal_code: string | null;
  distance?: number;
};

export type SpecialistSearchInput = {
  /** Raw lang string — "ru", "ua", "de", "uk". Normalised internally (ua → uk). */
  lang?: string | null;
  /** Category slug. */
  category?: string | null;
  /** "online" includes online + hybrid; anything else / null = no work_format filter. */
  mode?: string | null;
  /** Free-text place: 5-digit PLZ or city name (Latin / Cyrillic). */
  place?: string | null;
  /** Free-text smart search query. */
  q?: string | null;
  /**
   * Optional user search radius (km). When in allowlist
   * [5,10,25,30,50,100], used as the hard local limit (no progressive expand).
   */
  radius?: number | null;
  /** Pagination offset (default 0). */
  offset?: number;
};

export type SpecialistSearchResult = {
  data: SpecialistResult[];
  mode?: string;
  radius?: number;
  fallback?: string;
  error?: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Progressive local search radii when the user did not pick an explicit radius.
 * Subset of ALLOWED_SERVICE_RADII_KM (skip 5 km for progressive expand).
 * Includes public product radii 10/30/50/100 and legacy 25.
 *
 * Two search concerns (do not conflate):
 * 1) Location metadata (country/city/PLZ/coords) — applies to all specialists.
 * 2) Distance eligibility — offline/hybrid only via dual-radius; never gates pure online.
 */
const LOCAL_SEARCH_RADII_KM: readonly AllowedServiceRadiusKm[] =
  ALLOWED_SERVICE_RADII_KM.filter((r) => r >= 10);

const SELECT_COLS =
  "id, slug, name, bio, avatar_url, category_id, languages, work_format, postal_code, lat, lng, service_radius_km";

const VISIBLE_STATUS_FILTER = [...VISIBLE_PUBLIC_SPECIALIST_STATUSES];
const TEST_FILTER = "is_test.is.null,is_test.eq.false";

// ---------------------------------------------------------------------------
// Helpers (private)
// ---------------------------------------------------------------------------

function normalizeDistanceKm(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n * 10) / 10;
}

function parseUserSearchRadius(value: unknown): AllowedServiceRadiusKm | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return isAllowedServiceRadiusKm(n) ? n : null;
}

function applyVisibleSpecialistFilters<T extends { in: Function; eq: Function; or: Function }>(
  q: T
): T {
  let query = q
    .in("status", VISIBLE_STATUS_FILTER)
    .eq("is_active", true)
    .eq("is_visible", true)
    .or(TEST_FILTER) as T;
  return query;
}

function buildSpecialistQuery(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  opts: {
    lang: string | null;
    categoryId: string | null;
    mode: string | null;
    requireCoords: boolean;
    idFilter?: string[] | null;
    requireIdFilter?: boolean;
  }
) {
  let q = applyVisibleSpecialistFilters(
    supabase.from("specialists").select(SELECT_COLS)
  );

  if (opts.lang) q = q.contains("languages", [opts.lang]);
  if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
  if (opts.mode === "online") q = q.in("work_format", ["online", "hybrid"]);
  if (opts.requireCoords) q = q.not("lat", "is", null).not("lng", "is", null);

  if (opts.requireIdFilter) {
    if (!opts.idFilter || opts.idFilter.length === 0) {
      throw new Error("[searchSpecialists] q mode requires a non-empty idFilter");
    }
    q = q.in("id", opts.idFilter);
  } else if (opts.idFilter && opts.idFilter.length > 0) {
    q = q.in("id", opts.idFilter);
  }

  return q;
}

async function fetchByRadius(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  params: {
    refLat: number;
    refLng: number;
    radiusKm: number;
    lang: string | null;
    categoryId: string | null;
    offset: number;
    idFilter?: string[] | null;
  }
) {
  // p_mode null: RPC may return online rows; we exclude them in applyLocalDualRadiusFilter.
  // Do not pass p_mode 'offline' — observed empty in production baseline.
  return supabase.rpc("search_specialists_local_radius", {
    p_ref_lat: params.refLat,
    p_ref_lng: params.refLng,
    p_radius_km: params.radiusKm,
    p_lang: params.lang,
    p_category_id: params.categoryId,
    p_mode: null,
    p_offset: params.offset,
    p_limit: 20,
  });
}

/** RPC may not filter is_test; drop test specialists without a DB migration. */
async function excludeTestSpecialists(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  specialists: SpecialistRow[]
): Promise<SpecialistRow[]> {
  const ids = specialists.map((s) => s.id).filter((id): id is string => Boolean(id));
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("specialists")
    .select("id")
    .in("id", ids)
    .or(TEST_FILTER);
  const allowed = new Set((data ?? []).map((r) => r.id as string));
  return specialists.filter((s) => allowed.has(s.id));
}

/** RPC baseline may omit service_radius_km — hydrate from specialists. */
async function hydrateServiceRadiusKm(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  specialists: SpecialistRow[]
): Promise<SpecialistRow[]> {
  const ids = specialists.map((s) => s.id).filter(Boolean);
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("specialists")
    .select("id, service_radius_km")
    .in("id", ids);
  const radiusById = new Map<string, number | null>();
  for (const row of data ?? []) {
    if (!row?.id) continue;
    const raw = (row as { service_radius_km?: unknown }).service_radius_km;
    const n = typeof raw === "number" ? raw : Number(raw);
    radiusById.set(row.id as string, Number.isFinite(n) ? n : null);
  }
  return specialists.map((s) => ({
    ...s,
    service_radius_km:
      radiusById.has(s.id) ? radiusById.get(s.id) ?? null : s.service_radius_km ?? null,
  }));
}

/**
 * Local geo post-filter: drop pure online; require dual-radius for offline/hybrid;
 * attach distance; sort by distance asc, then id.
 */
function applyLocalDualRadiusFilter(
  rows: SpecialistRow[],
  refLat: number,
  refLng: number,
  userSearchRadiusKm: AllowedServiceRadiusKm
): SpecialistRow[] {
  const filtered: SpecialistRow[] = [];

  for (const row of rows) {
    const wf = normalizeWorkFormat(row.work_format);
    // Local/PLZ/city geo search must exclude pure online (RPC returns them when p_mode null).
    if (!wf || wf === "online") continue;

    let dist = normalizeDistanceKm(row.distance);
    if (dist === undefined) {
      const lat = typeof row.lat === "number" ? row.lat : Number(row.lat);
      const lng = typeof row.lng === "number" ? row.lng : Number(row.lng);
      if (areValidCoordinates(lat, lng)) {
        dist = normalizeDistanceKm(distanceKm(refLat, refLng, lat, lng));
      }
    }
    if (dist === undefined) continue;

    if (
      !isWithinDualRadius({
        workFormat: row.work_format,
        distanceKm: dist,
        userSearchRadiusKm,
        specialistServiceRadiusKm: row.service_radius_km,
      })
    ) {
      continue;
    }

    filtered.push({ ...row, distance: dist });
  }

  filtered.sort((a, b) => {
    const da = typeof a.distance === "number" ? a.distance : Number.POSITIVE_INFINITY;
    const db = typeof b.distance === "number" ? b.distance : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return a.id.localeCompare(b.id);
  });

  return filtered;
}

async function filterRowsByIdFilter(
  rows: SpecialistRow[],
  idFilter: string[] | null | undefined
): Promise<SpecialistRow[]> {
  if (!idFilter || idFilter.length === 0) return rows;
  const allowed = new Set(idFilter);
  return rows.filter((row) => allowed.has(row.id));
}

async function mapWithCategories(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  specialists: SpecialistRow[]
): Promise<SpecialistResult[]> {
  const categoryIds = Array.from(
    new Set(specialists.map((s) => s.category_id).filter((id): id is string => Boolean(id)))
  );

  let categoryMap: Record<string, CategoryRow> = {};
  if (categoryIds.length > 0) {
    const { data: cats } = await supabase
      .from("categories")
      .select("id, slug, title, title_ru, title_de, title_ua")
      .in("id", categoryIds);
    (cats ?? []).forEach((c: CategoryRow) => {
      categoryMap[c.id] = c;
    });
  }

  return specialists.map((s) => {
    const cat = s.category_id ? categoryMap[s.category_id] : null;
    const distance = normalizeDistanceKm(s.distance);
    return {
      id: s.id,
      slug: s.slug ?? null,
      name: s.name != null && String(s.name).trim() ? String(s.name).trim() : null,
      bio: s.bio,
      avatar_url: s.avatar_url,
      category_id: s.category_id,
      category_slug: cat?.slug ?? null,
      category_title: cat?.title ?? null,
      category_title_ru: cat?.title_ru ?? null,
      category_title_de: cat?.title_de ?? null,
      category_title_ua: cat?.title_ua ?? null,
      languages: s.languages ?? [],
      work_format: s.work_format,
      postal_code: s.postal_code,
      ...(distance !== undefined ? { distance } : {}),
    };
  });
}

async function searchByCityIlike(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  params: {
    cityVariants: string[];
    lang: string | null;
    categoryId: string | null;
    mode: string | null;
    offset: number;
    idFilter?: string[] | null;
    requireIdFilter?: boolean;
  }
): Promise<{ rows: SpecialistRow[]; error: unknown }> {
  const safeVariants = params.cityVariants
    .map(sanitizeCityFilter)
    .filter((v) => v.length > 0);

  if (safeVariants.length === 0) return { rows: [], error: null };

  const cityFilters = safeVariants.map((v) => `city.ilike.%${v}%`).join(",");
  const { data: profileRows, error: profileError } = await supabase
    .from("specialist_profiles")
    .select("specialist_id")
    .or(cityFilters);

  if (profileError) return { rows: [], error: profileError };

  const matchedIds = (profileRows ?? [])
    .map((r) => (r as { specialist_id: string }).specialist_id)
    .filter(Boolean);

  if (matchedIds.length === 0) return { rows: [], error: null };

  let q = buildSpecialistQuery(supabase, {
    lang: params.lang,
    categoryId: params.categoryId,
    mode: params.mode,
    requireCoords: false,
    idFilter: params.idFilter,
    requireIdFilter: params.requireIdFilter,
  });
  q = q.in("id", matchedIds).range(params.offset, params.offset + 19).limit(20);

  const { data: rows, error } = await q;
  return { rows: (rows ?? []) as SpecialistRow[], error };
}

/**
 * Last-resort city ILIKE when Nominatim geocode failed (no ref coords for dual-radius).
 * Still excludes pure online; keeps offline/hybrid only when service_radius_km is allowlisted.
 */
function filterCityIlikeLocalRows(rows: SpecialistRow[]): SpecialistRow[] {
  return rows.filter((row) => {
    const wf = normalizeWorkFormat(row.work_format);
    if (!wf || wf === "online") return false;
    return isAllowedServiceRadiusKm(row.service_radius_km);
  });
}

async function searchLocalByRadii(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  params: {
    refLat: number;
    refLng: number;
    /** When set, single hard-limit fetch — no progressive expand. */
    explicitRadius: AllowedServiceRadiusKm | null;
    lang: string | null;
    categoryId: string | null;
    offset: number;
    idFilter?: string[] | null;
  }
): Promise<{ rows: SpecialistRow[]; radiusKm: number; error: unknown }> {
  const radii: readonly AllowedServiceRadiusKm[] = params.explicitRadius
    ? [params.explicitRadius]
    : LOCAL_SEARCH_RADII_KM;

  for (const radiusKm of radii) {
    const { data: rows, error: rpcError } = await fetchByRadius(supabase, {
      refLat: params.refLat,
      refLng: params.refLng,
      radiusKm,
      lang: params.lang,
      categoryId: params.categoryId,
      offset: params.offset,
      idFilter: params.idFilter,
    });

    if (rpcError) {
      return { rows: [], radiusKm, error: rpcError };
    }

    const listRaw = (rows ?? []) as SpecialistRow[];
    const listFiltered = await filterRowsByIdFilter(listRaw, params.idFilter);
    const listNoTest = await excludeTestSpecialists(supabase, listFiltered);
    const hydrated = await hydrateServiceRadiusKm(supabase, listNoTest);
    const local = applyLocalDualRadiusFilter(
      hydrated,
      params.refLat,
      params.refLng,
      radiusKm
    );

    if (local.length > 0 || params.explicitRadius != null) {
      return { rows: local, radiusKm, error: null };
    }
  }

  return { rows: [], radiusKm: radii[radii.length - 1] ?? 100, error: null };
}

async function fetchIdsByOrFilter(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  table: string,
  idColumn: string,
  orFilter: string | null,
  options?: { visibleSpecialistsOnly?: boolean; activeServicesOnly?: boolean }
): Promise<string[]> {
  if (!orFilter) return [];

  let q = supabase.from(table).select(idColumn).or(orFilter);
  if (options?.visibleSpecialistsOnly) {
    q = applyVisibleSpecialistFilters(q);
  }
  if (options?.activeServicesOnly) {
    q = q.eq("is_active", true);
  }

  const { data, error } = await q;
  if (error) {
    console.error(`[searchSpecialists] ${table} text search error:`, error);
    return [];
  }

  return (data ?? [])
    .map((row) => (row as unknown as Record<string, string>)[idColumn])
    .filter(Boolean);
}

async function resolveQueryMatches(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  normalizedQuery: string,
  terms: string[]
): Promise<QueryMatchResult> {
  const specialistIds = new Set<string>();
  const categoryIds = new Set<string>();

  const synonymSlugs = resolveCategorySlugsFromQuery(normalizedQuery);
  if (synonymSlugs.length > 0) {
    const { data: synCats } = await supabase
      .from("categories")
      .select("id")
      .in("slug", synonymSlugs);
    (synCats ?? []).forEach((row) => {
      if (row?.id) categoryIds.add(row.id as string);
    });
  }

  // Full-phrase category match only (avoid broad per-word category ilike).
  const phraseFilter = buildIlikeOrFilter([normalizedQuery], [
    "slug",
    "title",
    "title_ru",
    "title_de",
    "title_ua",
  ]);
  if (phraseFilter) {
    const { data: cats } = await supabase.from("categories").select("id").or(phraseFilter);
    (cats ?? []).forEach((row) => {
      if (row?.id) categoryIds.add(row.id as string);
    });
  }

  const nameFilter = buildIlikeOrFilter(terms, ["name"]);
  if (nameFilter) {
    const ids = await fetchIdsByOrFilter(supabase, "specialists", "id", nameFilter, {
      visibleSpecialistsOnly: true,
    });
    ids.forEach((id) => specialistIds.add(id));
  }

  const profileFilter = buildIlikeOrFilter(terms, [
    "about_me",
    "services",
    "experience",
  ]);
  if (profileFilter) {
    let profileIds = await fetchIdsByOrFilter(
      supabase,
      "specialist_profiles",
      "specialist_id",
      profileFilter
    );

    if (profileIds.length === 0) {
      const fallbackFilter = buildIlikeOrFilter(terms, ["about_me"]);
      if (fallbackFilter) {
        profileIds = await fetchIdsByOrFilter(
          supabase,
          "specialist_profiles",
          "specialist_id",
          fallbackFilter
        );
      }
    }

    profileIds.forEach((id) => specialistIds.add(id));
  }

  const serviceTitleFilter = buildIlikeOrFilter(terms, ["title"]);
  if (serviceTitleFilter) {
    const serviceIds = await fetchIdsByOrFilter(
      supabase,
      "specialist_services",
      "specialist_id",
      serviceTitleFilter,
      { activeServicesOnly: true }
    );
    serviceIds.forEach((id) => specialistIds.add(id));
  }

  return { specialistIds, categoryIds };
}

async function resolveQuerySpecialistIds(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  normalizedQuery: string,
  lang: string | null
): Promise<string[]> {
  const terms = expandSearchTerms(normalizedQuery);
  if (terms.length === 0) return [];

  const { specialistIds, categoryIds } = await resolveQueryMatches(
    supabase,
    normalizedQuery,
    terms
  );

  if (categoryIds.size > 0) {
    let q = applyVisibleSpecialistFilters(
      supabase.from("specialists").select("id")
    ).in("category_id", Array.from(categoryIds));
    if (lang) q = q.contains("languages", [lang]);

    const { data, error } = await q;
    if (error) {
      console.error("[searchSpecialists] category expansion error:", error);
      return [];
    }
    return (data ?? [])
      .map((row) => row?.id as string)
      .filter(Boolean);
  }

  return Array.from(specialistIds);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Search specialists by the given criteria.
 * Can be called directly from SSR pages — no HTTP roundtrip needed.
 */
export async function searchSpecialists(
  input: SpecialistSearchInput
): Promise<SpecialistSearchResult> {
  const normalizedLang = normalizeSearchLangToDbCode(input.lang ?? null);
  const category = input.category?.trim() || null;
  const mode = input.mode?.trim().toLowerCase() || null;
  const place = input.place?.trim() || null;
  const normalizedQ = normalizeSearchQuery(input.q ?? null);
  const explicitRadius = parseUserSearchRadius(input.radius);
  const offsetRaw = input.offset ?? 0;
  const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;
  const hasQuery = Boolean(normalizedQ);

  try {
    const supabase = createSupabaseServerClient();

    let queryIdFilter: string[] | null = null;
    if (normalizedQ) {
      queryIdFilter = await resolveQuerySpecialistIds(
        supabase,
        normalizedQ,
        normalizedLang
      );
      if (queryIdFilter.length === 0) {
        return { data: [], mode: "query" };
      }
    }

    // Resolve category slug → id (one query)
    let categoryId: string | null = null;
    if (category) {
      if (category.toLowerCase() === UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG) {
        return { data: [], mode: hasQuery ? "query" : "all" };
      }
      const { data: catRow } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", category)
        .maybeSingle();
      if (!catRow?.id) return { data: [], mode: hasQuery ? "query" : "all" };
      categoryId = catRow.id;
    }

    const resultMode = hasQuery ? "query" : undefined;
    const queryOpts = {
      requireIdFilter: hasQuery,
      idFilter: queryIdFilter,
    };

    // --- Online mode ---
    // online + hybrid: no distance filter; location metadata may still exist for display/admin.
    if (mode === "online") {
      let q = buildSpecialistQuery(supabase, {
        lang: normalizedLang,
        categoryId,
        mode: "online",
        requireCoords: false,
        ...queryOpts,
      });
      q = q.range(offset, offset + 19).limit(20);
      const { data: rows, error } = await q;
      if (error) {
        console.error("[searchSpecialists] online error:", error);
        return { data: [] };
      }
      const data = await mapWithCategories(supabase, (rows ?? []) as SpecialistRow[]);
      return { data, mode: resultMode ?? "online" };
    }

    // --- No place: language/category/query filter ---
    if (!place) {
      let q = buildSpecialistQuery(supabase, {
        lang: normalizedLang,
        categoryId,
        mode: null,
        requireCoords: false,
        ...queryOpts,
      });
      q = q.range(offset, offset + 19).limit(20);
      const { data: rows, error } = await q;
      if (error) {
        console.error("[searchSpecialists] all error:", error);
        return { data: [] };
      }
      const data = await mapWithCategories(supabase, (rows ?? []) as SpecialistRow[]);
      return { data, mode: resultMode ?? "all" };
    }

    // --- City-name search: Nominatim → radius RPC; ILIKE only if geocode fails ---
    if (!isPostalCodeLike(place)) {
      const normalized = normalizePlaceInput(place);
      if (!normalized) return { data: [], fallback: "invalid_plz" };

      const cityVariants = expandPlaceAliases(normalized);
      const geocodeQuery = cityVariants[0] ?? normalized;
      const geocoded = await geocodeGermanCityViaNominatim(geocodeQuery);

      if (geocoded) {
        const localResult = await searchLocalByRadii(supabase, {
          refLat: geocoded.lat,
          refLng: geocoded.lng,
          explicitRadius,
          lang: normalizedLang,
          categoryId,
          offset,
          idFilter: queryIdFilter,
        });

        if (localResult.error) {
          console.error("[searchSpecialists] city radius error:", localResult.error);
          return { data: [] };
        }

        if (localResult.rows.length > 0) {
          const data = await mapWithCategories(supabase, localResult.rows);
          return {
            data,
            mode: resultMode ?? "local",
            radius: localResult.radiusKm,
          };
        }

        return { data: [], fallback: "no_local_results", radius: localResult.radiusKm };
      }

      // Last-resort fallback: ILIKE on specialist_profiles.city when Nominatim geocode fails.
      // Dual-radius cannot run without ref coordinates; online is still excluded.
      const cityResult = await searchByCityIlike(supabase, {
        cityVariants,
        lang: normalizedLang,
        categoryId,
        mode: null,
        offset,
        ...queryOpts,
      });

      if (cityResult.error) {
        console.error("[searchSpecialists] city ilike fallback error:", cityResult.error);
        return { data: [] };
      }

      const cityList = filterCityIlikeLocalRows(
        await excludeTestSpecialists(supabase, cityResult.rows)
      );
      if (cityList.length > 0) {
        const data = await mapWithCategories(supabase, cityList);
        return { data, mode: resultMode ?? "city" };
      }

      return { data: [], fallback: "no_local_results" };
    }

    // --- PLZ radius search ---
    const { data: plzData, error: plzError } = await supabase
      .from("postal_codes")
      .select("lat, lng")
      .eq("postal_code", place)
      .maybeSingle();

    if (plzError) {
      console.error("[searchSpecialists] plz error:", plzError);
      return { data: [] };
    }
    if (!plzData) return { data: [], fallback: "invalid_plz" };

    const plzLat = plzData.lat != null ? Number(plzData.lat) : NaN;
    const plzLng = plzData.lng != null ? Number(plzData.lng) : NaN;
    if (!areValidCoordinates(plzLat, plzLng)) {
      return { data: [], fallback: "invalid_plz" };
    }

    const localResult = await searchLocalByRadii(supabase, {
      refLat: plzLat,
      refLng: plzLng,
      explicitRadius,
      lang: normalizedLang,
      categoryId,
      offset,
      idFilter: queryIdFilter,
    });

    if (localResult.error) {
      console.error("[searchSpecialists] radius error:", localResult.error);
      return { data: [] };
    }

    if (localResult.rows.length > 0) {
      const data = await mapWithCategories(supabase, localResult.rows);
      return {
        data,
        mode: resultMode ?? "local",
        radius: localResult.radiusKm,
      };
    }

    return { data: [], fallback: "no_local_results", radius: localResult.radiusKm };
  } catch (e: unknown) {
    console.error("[searchSpecialists] unexpected error:", e);
    return { data: [] };
  }
}
