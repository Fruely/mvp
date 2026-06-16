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
} from "@/lib/search/placeSearch";
import {
  normalizeSearchQuery,
  expandSearchTerms,
  resolveCategorySlugsFromQuery,
  buildIlikeOrFilter,
} from "@/lib/search/searchSynonyms";

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

/** Progressive local search radii (km). */
const LOCAL_SEARCH_RADII_KM = [10, 30, 50, 100] as const;

const SELECT_COLS =
  "id, slug, name, bio, avatar_url, category_id, languages, work_format, postal_code, lat, lng";

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

async function searchByCity(
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

    // --- City-name search ---
    if (!isPostalCodeLike(place)) {
      const normalized = normalizePlaceInput(place);
      if (!normalized) return { data: [], fallback: "invalid_plz" };

      const cityVariants = expandPlaceAliases(normalized);
      const cityResult = await searchByCity(supabase, {
        cityVariants,
        lang: normalizedLang,
        categoryId,
        mode: null,
        offset,
        ...queryOpts,
      });

      if (cityResult.error) {
        console.error("[searchSpecialists] city error:", cityResult.error);
        return { data: [] };
      }

      const cityList = await excludeTestSpecialists(supabase, cityResult.rows);
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
    if (!Number.isFinite(plzLat) || !Number.isFinite(plzLng)) {
      return { data: [], fallback: "invalid_plz" };
    }

    for (const radiusKm of LOCAL_SEARCH_RADII_KM) {
      const { data: rows, error: rpcError } = await fetchByRadius(supabase, {
        refLat: plzLat,
        refLng: plzLng,
        radiusKm,
        lang: normalizedLang,
        categoryId,
        offset,
        idFilter: queryIdFilter,
      });

      if (rpcError) {
        console.error("[searchSpecialists] radius error:", rpcError);
        return { data: [] };
      }

      const listRaw = (rows ?? []) as SpecialistRow[];
      const listFiltered = await filterRowsByIdFilter(listRaw, queryIdFilter);
      const list = await excludeTestSpecialists(supabase, listFiltered);
      if (list.length > 0) {
        const data = await mapWithCategories(supabase, list);
        return { data, mode: resultMode ?? "local", radius: radiusKm };
      }
    }

    return { data: [], fallback: "no_local_results" };
  } catch (e: unknown) {
    console.error("[searchSpecialists] unexpected error:", e);
    return { data: [] };
  }
}
