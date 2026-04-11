import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { normalizeLang } from "@/lib/normalizeLang";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export const dynamic = "force-dynamic";

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
  /** Present when row comes from `search_specialists_local_radius` (RPC). */
  distance?: number | null;
};

/** Progressive local search radii (km). Distance filtering runs in SQL via `distance_km`. */
const LOCAL_SEARCH_RADII_KM = [10, 30, 50, 100] as const;

function normalizeDistanceKmForResponse(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  return Math.round(n * 10) / 10;
}

const SELECT_COLS =
  "id, slug, name, bio, avatar_url, category_id, languages, work_format, postal_code, lat, lng";

function buildSpecialistSearchQuery(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  opts: {
    lang: string | null;
    categoryId: string | null;
    mode: string | null;
    requireCoords: boolean;
  }
) {
  let q = supabase
    .from("specialists")
    .select(SELECT_COLS)
    .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
    .eq("is_active", true)
    .eq("is_visible", true);

  if (opts.lang) {
    q = q.contains("languages", [opts.lang]);
  }
  if (opts.categoryId) {
    q = q.eq("category_id", opts.categoryId);
  }
  if (opts.mode === "online") {
    q = q.eq("work_format", "online");
  }
  if (opts.requireCoords) {
    q = q.not("lat", "is", null).not("lng", "is", null);
  }
  return q;
}

/** Uses SQL `distance_km` inside DB function `search_specialists_local_radius` (see Supabase SQL). */
async function fetchSpecialistsLocalByRadius(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  params: {
    refLat: number;
    refLng: number;
    radiusKm: number;
    lang: string | null;
    categoryId: string | null;
    offset: number;
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

/**
 * Response contract (no implicit work_format switching; local search never mixes online/hybrid):
 * - place + invalid PLZ → { data: [], fallback: "invalid_plz" }
 * - place + valid PLZ, empty radii → { data: [], fallback: "no_local_results" }
 * - place + hits → { data, mode: "local", radius }
 * - no place, default → { data, mode: "all" }
 * - mode=online → { data, mode: "online" } (ignores place; work_format = online only)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang")?.trim() || null;
    const normalizedLang = lang ? normalizeLang(lang) : null;
    const place = searchParams.get("place")?.trim() || null;
    const category = searchParams.get("category")?.trim() || null;
    const mode = searchParams.get("mode")?.trim().toLowerCase() || null;
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;

    const supabase = createSupabaseServerClient();

    let categoryId: string | null = null;
    if (category) {
      const { data: categoryRow } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", category)
        .maybeSingle();
      if (!categoryRow?.id) {
        return jsonNoStore({ data: [], mode: "all" });
      }
      categoryId = categoryRow.id;
    }

    if (mode === "online") {
      let query = buildSpecialistSearchQuery(supabase, {
        lang: normalizedLang,
        categoryId,
        mode: "online",
        requireCoords: false,
      });
      query = query.range(offset, offset + 19).limit(20);

      const { data: rows, error } = await query;

      if (error) {
        console.error("search error:", error);
        return jsonNoStore({ data: [] });
      }

      const specialists = (rows ?? []) as SpecialistRow[];
      const data = await mapSpecialistsWithCategories(supabase, specialists);
      return jsonNoStore({ data, mode: "online" });
    }

    if (!place) {
      let query = buildSpecialistSearchQuery(supabase, {
        lang: normalizedLang,
        categoryId,
        mode: null,
        requireCoords: false,
      });
      query = query.range(offset, offset + 19).limit(20);

      const { data: rows, error } = await query;

      if (error) {
        console.error("search error:", error);
        return jsonNoStore({ data: [] });
      }

      const specialists = (rows ?? []) as SpecialistRow[];
      const data = await mapSpecialistsWithCategories(supabase, specialists);
      return jsonNoStore({ data, mode: "all" });
    }

    const { data: plzData, error: plzError } = await supabase
      .from("postal_codes")
      .select("lat, lng")
      .eq("postal_code", place)
      .maybeSingle();

    if (plzError) {
      console.error("search error:", plzError);
      return jsonNoStore({ data: [] });
    }

    if (!plzData) {
      return jsonNoStore({ data: [], fallback: "invalid_plz" });
    }

    const plzLat = plzData.lat != null ? Number(plzData.lat) : NaN;
    const plzLng = plzData.lng != null ? Number(plzData.lng) : NaN;

    if (!Number.isFinite(plzLat) || !Number.isFinite(plzLng)) {
      return jsonNoStore({ data: [], fallback: "invalid_plz" });
    }

    for (const radiusKm of LOCAL_SEARCH_RADII_KM) {
      const { data: rows, error: rpcError } = await fetchSpecialistsLocalByRadius(supabase, {
        refLat: plzLat,
        refLng: plzLng,
        radiusKm,
        lang: normalizedLang,
        categoryId,
        offset,
      });

      if (rpcError) {
        console.error("search error:", rpcError);
        return jsonNoStore({ data: [] });
      }

      const list = (rows ?? []) as SpecialistRow[];
      if (list.length > 0) {
        const data = await mapSpecialistsWithCategories(supabase, list);
        return jsonNoStore({
          data,
          mode: "local",
          radius: radiusKm,
        });
      }
    }

    return jsonNoStore({
      data: [],
      fallback: "no_local_results",
    });
  } catch (e: unknown) {
    console.error("search error:", e);
    return jsonNoStore({ data: [] });
  }
}

async function mapSpecialistsWithCategories(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  specialists: SpecialistRow[]
) {
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
    const distanceKm = normalizeDistanceKmForResponse(
      (s as SpecialistRow).distance
    );
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
      ...(distanceKm !== undefined ? { distance: distanceKm } : {}),
    };
  });
}
