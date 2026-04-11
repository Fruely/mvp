import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
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
};

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang")?.trim() || null;
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

    if (!place) {
      let query = buildSpecialistSearchQuery(supabase, {
        lang,
        categoryId,
        mode,
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

    const plzLat =
      plzData != null && plzData.lat != null ? Number(plzData.lat) : NaN;
    const plzLng =
      plzData != null && plzData.lng != null ? Number(plzData.lng) : NaN;

    if (!Number.isFinite(plzLat) || !Number.isFinite(plzLng)) {
      return jsonNoStore({
        data: [],
        fallback: "no_local_results",
      });
    }

    let coordQuery = buildSpecialistSearchQuery(supabase, {
      lang,
      categoryId,
      mode,
      requireCoords: true,
    });

    const { data: coordRows, error: coordError } = await coordQuery;

    if (coordError) {
      console.error("search error:", coordError);
      return jsonNoStore({ data: [] });
    }

    const withCoords = (coordRows ?? []).filter((row): row is SpecialistRow => {
      const r = row as SpecialistRow;
      return (
        typeof r.lat === "number" &&
        typeof r.lng === "number" &&
        Number.isFinite(r.lat) &&
        Number.isFinite(r.lng)
      );
    });

    const radiuses = [10, 30, 50, 100];

    for (const radius of radiuses) {
      const results = withCoords.filter((s) => {
        const distance = getDistanceKm(plzLat, plzLng, s.lat as number, s.lng as number);
        return distance <= radius;
      });

      if (results.length > 0) {
        const page = results.slice(offset, offset + 20);
        const data = await mapSpecialistsWithCategories(supabase, page);
        return jsonNoStore({
          data,
          mode: "local",
          radius,
        });
      }
    }

    return jsonNoStore({
      data: [],
      fallback: "no_local_results",
    });
  } catch (e: unknown) {
    console.error("[specialists/search] unexpected:", e);
    return jsonNoStore({ error: "Internal server error" }, { status: 500 });
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
      work_format: s.work_format ?? "online",
      postal_code: s.postal_code,
    };
  });
}
