import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export const dynamic = "force-dynamic";

type WorkFormat = "online" | "offline" | "hybrid";

type SpecialistRow = {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  category_id: string | null;
  languages: string[] | null;
  work_format?: WorkFormat | null;
  plz?: string | null;
  lat?: number | null;
  lng?: number | null;
  service_radius_km?: number | null;
  postal_code: string | null;
};

type CategoryRow = { id: string; slug: string; title: string | null };

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function geocode(place: string): Promise<{ lat: number; lng: number } | null> {
  const q = encodeURIComponent(place.trim());
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Freuly/1.0 (https://freuly.de)" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat?: string; lon?: string }[];
    if (!Array.isArray(data) || !data[0]?.lat || !data[0]?.lon) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch {
    return null;
  }
}

function matchesQ(q: string, slug: string | null, title: string | null): boolean {
  const lower = q.trim().toLowerCase();
  if (!lower) return true;
  const slugMatch = slug && slug.toLowerCase().includes(lower);
  const titleMatch = title && title.toLowerCase().includes(lower);
  return Boolean(slugMatch || titleMatch);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang")?.trim();
    const place = searchParams.get("place")?.trim();
    const q = searchParams.get("q")?.trim() || null;
    const category = searchParams.get("category")?.trim() || null;
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;

    if (!lang || !place) {
      return jsonNoStore(
        { error: "lang and place are required" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServerClient();

    type SelectCols =
      | "id, name, bio, avatar_url, category_id, languages, work_format, plz, lat, lng, service_radius_km, postal_code"
      | "id, name, bio, avatar_url, category_id, languages, postal_code";

    let rows: unknown[] | null = null;
    let specError: { message?: string } | null = null;

    const fullSelect: SelectCols =
      "id, name, bio, avatar_url, category_id, languages, work_format, plz, lat, lng, service_radius_km, postal_code";
    const minimalSelect: SelectCols =
      "id, name, bio, avatar_url, category_id, languages, postal_code";

    const res = await supabase
      .from("search_specialists")
      .select(fullSelect)
      .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
      .eq("is_active", true)
      .eq("is_visible", true)
      .range(offset, offset + 19)
      .limit(20);

    specError = res.error;
    rows = res.data;

    if (specError && /column.*does not exist/i.test(specError.message ?? "")) {
      const fallback = await supabase
        .from("search_specialists")
        .select(minimalSelect)
        .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
        .eq("is_active", true)
        .eq("is_visible", true)
        .range(offset, offset + 19)
        .limit(20);
      specError = fallback.error;
      rows = fallback.data;
    }

    if (specError) {
      console.error("[specialists/search] specialists fetch:", specError);
      return jsonNoStore(
        { error: "Failed to fetch specialists" },
        { status: 500 }
      );
    }

    const specialists = (rows ?? []) as SpecialistRow[];
    const categoryIds = Array.from(
      new Set(
        specialists.map((s) => s.category_id).filter((id): id is string => Boolean(id))
      )
    );

    let categoryMap: Record<string, CategoryRow> = {};
    if (categoryIds.length > 0) {
      const { data: cats } = await supabase
        .from("categories")
        .select("id, slug, title")
        .in("id", categoryIds);
      (cats ?? []).forEach((c: CategoryRow) => {
        categoryMap[c.id] = c;
      });
    }

    let specialistIdsByCategory: Set<string> | null = null;
    if (category) {
      const { data: categoryRow } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", category)
        .maybeSingle();

      if (!categoryRow?.id) {
        return jsonNoStore({ data: [] });
      }

      const { data: serviceRows, error: servicesError } = await supabase
        .from("specialist_services")
        .select("specialist_id, price_from")
        .eq("category_id", categoryRow.id)
        .eq("is_active", true);

      if (servicesError) {
        console.error("[specialists/search] specialist_services fetch:", servicesError);
        return jsonNoStore(
          { error: "Failed to fetch specialists" },
          { status: 500 }
        );
      }

      specialistIdsByCategory = new Set(
        (serviceRows ?? [])
          .filter(
            (row) =>
              typeof row.specialist_id === "string" &&
              typeof row.price_from === "number" &&
              Number.isFinite(row.price_from) &&
              row.price_from >= 0
          )
          .map((row) => String(row.specialist_id))
      );
    }

    const placeCoords = await geocode(place);

    const langLower = lang.toLowerCase();
    const filtered: (SpecialistRow & { _distance?: number; _cat?: CategoryRow })[] = [];

    for (const s of specialists) {
      if (specialistIdsByCategory && !specialistIdsByCategory.has(s.id)) continue;

      const langs = Array.isArray(s.languages)
        ? s.languages.map((l) => String(l).toLowerCase())
        : [];
      if (!langs.includes(langLower)) continue;

      const fmt = (s.work_format ?? "online") as WorkFormat;

      if (fmt === "online" || fmt === "hybrid") {
        // always include
      } else if (fmt === "offline") {
        if (!placeCoords) continue;
        const slat = s.lat ?? null;
        const slng = s.lng ?? null;
        const radius = s.service_radius_km ?? 0;
        if (slat == null || slng == null || radius <= 0) continue;
        const dist = haversineKm(
          placeCoords.lat,
          placeCoords.lng,
          slat,
          slng
        );
        if (dist > radius) continue;
      }

      const cat = s.category_id ? categoryMap[s.category_id] : null;
      if (q && !matchesQ(q, cat?.slug ?? null, cat?.title ?? null)) continue;

      const rec = { ...s, _cat: cat ?? undefined };
      if (fmt === "offline" && placeCoords && s.lat != null && s.lng != null) {
        (rec as any)._distance = haversineKm(
          placeCoords.lat,
          placeCoords.lng,
          s.lat,
          s.lng
        );
      }
      filtered.push(rec);
    }

    const orderKey = (s: (typeof filtered)[0]) => {
      const fmt = (s.work_format ?? "online") as WorkFormat;
      if (fmt === "hybrid") return [0, 0];
      if (fmt === "online") return [1, 0];
      return [2, (s as any)._distance ?? Infinity];
    };

    filtered.sort((a, b) => {
      const [a0, a1] = orderKey(a);
      const [b0, b1] = orderKey(b);
      if (a0 !== b0) return a0 - b0;
      return a1 - b1;
    });

    const data = filtered.map((s) => ({
      id: s.id,
      name: s.name,
      bio: s.bio,
      avatar_url: s.avatar_url,
      category_id: s.category_id,
      category_slug: s._cat?.slug ?? null,
      category_title: s._cat?.title ?? null,
      languages: s.languages ?? [],
      work_format: s.work_format ?? "online",
      postal_code: s.postal_code,
    }));

    return jsonNoStore({ data });
  } catch (e: any) {
    console.error("[specialists/search] unexpected:", e);
    return jsonNoStore(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
