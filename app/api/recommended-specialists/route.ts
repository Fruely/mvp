import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export const dynamic = "force-dynamic";

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export async function GET() {
  const supabase = createSupabaseServerClient();

  const { data: specRows, error: specError } = await supabase
    .from("specialists")
    .select("id, slug, name, avatar_url, category_id, languages, featured_priority, is_featured")
    .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
    .eq("is_active", true)
    .eq("is_visible", true)
    .eq("is_verified", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(10);

  if (specError) {
    return jsonNoStore({ error: specError.message }, { status: 500 });
  }

  const specialists = specRows ?? [];
  if (specialists.length === 0) return jsonNoStore({ data: [] });

  const specialistIds = specialists.map((r) => r.id);
  const { data: profiles } = await supabase
    .from("specialist_profiles")
    .select("specialist_id, city, photo_url")
    .in("specialist_id", specialistIds);

  const profileBySpecialistId = new Map<string, { city: string | null; photo_url: string | null }>();
  for (const p of profiles ?? []) {
    if (p?.specialist_id) {
      profileBySpecialistId.set(p.specialist_id, {
        city: typeof p.city === "string" ? p.city : null,
        photo_url: typeof p.photo_url === "string" ? p.photo_url : null,
      });
    }
  }

  const categoryIds = Array.from(
    new Set(
      specialists
        .map((row) => (typeof row.category_id === "string" ? row.category_id : null))
        .filter((id): id is string => Boolean(id))
    )
  );

  let categoryById = new Map<string, {
    title: string | null;
    title_ru: string | null;
    title_de: string | null;
    title_ua: string | null;
    slug: string | null;
  }>();
  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from("categories")
      .select("id, title, title_ru, title_de, title_ua, slug")
      .in("id", categoryIds);
    categoryById = new Map(
      (categories ?? []).map((category) => [
        String(category.id),
        {
          title: typeof category.title === "string" ? category.title : null,
          title_ru: typeof category.title_ru === "string" ? category.title_ru : null,
          title_de: typeof category.title_de === "string" ? category.title_de : null,
          title_ua: typeof category.title_ua === "string" ? category.title_ua : null,
          slug: typeof category.slug === "string" ? category.slug : null,
        },
      ])
    );
  }

  const { data: ratingRows } = await supabase
    .from("specialist_rating_stats")
    .select("specialist_id, rating_avg, reviews_count")
    .in("specialist_id", specialistIds);

  const ratingBySpecialistId = new Map<string, { rating_avg: number | null; reviews_count: number }>();
  for (const r of ratingRows ?? []) {
    if (typeof r?.specialist_id === "string") {
      ratingBySpecialistId.set(r.specialist_id, {
        rating_avg: typeof r.rating_avg === "number" ? r.rating_avg : null,
        reviews_count: typeof r.reviews_count === "number" ? r.reviews_count : 0,
      });
    }
  }

  const grouped = new Map<number, typeof specialists>();
  for (const specialist of specialists) {
    const priority = Number.isFinite(specialist.featured_priority)
      ? Number(specialist.featured_priority)
      : 0;
    const list = grouped.get(priority) ?? [];
    list.push(specialist);
    grouped.set(priority, list);
  }

  const orderedPriorities = Array.from(grouped.keys()).sort((a, b) => b - a);
  const mixed: typeof specialists = [];
  for (const priority of orderedPriorities) {
    mixed.push(...shuffle(grouped.get(priority) ?? []));
  }

  const data = mixed.slice(0, 8).map((row) => {
    const profile = profileBySpecialistId.get(row.id);
    const category =
      typeof row.category_id === "string" ? categoryById.get(row.category_id) : undefined;
    return {
      id: row.id,
      slug: row.slug ?? null,
      name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : null,
      avatar_url: row.avatar_url ?? profile?.photo_url ?? null,
      city: profile?.city ?? null,
      languages: Array.isArray(row.languages) ? row.languages : [],
      category_title: category?.title ?? null,
      category_title_ru: category?.title_ru ?? null,
      category_title_de: category?.title_de ?? null,
      category_title_ua: category?.title_ua ?? null,
      category_slug: category?.slug ?? null,
      featured_priority: row.featured_priority ?? 0,
      rating_avg: ratingBySpecialistId.get(row.id)?.rating_avg ?? null,
      reviews_count: ratingBySpecialistId.get(row.id)?.reviews_count ?? 0,
    };
  });

  return jsonNoStore({ data });
}
