import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { displayName } from "@/lib/specialists/displayName";

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

  const { data: featuredRows, error: featuredError } = await supabase
    .from("specialists")
    .select("id")
    .eq("is_featured", true)
    .eq("status", "featured_verified")
    .limit(10);

  if (featuredError) {
    return jsonNoStore({ error: featuredError.message }, { status: 500 });
  }

  const featuredIds = (featuredRows ?? [])
    .map((row) => (row && typeof row.id === "string" ? row.id : null))
    .filter((id): id is string => Boolean(id));

  if (featuredIds.length === 0) return jsonNoStore({ data: [] });

  const { data: specRows, error: specError } = await supabase
    .from("specialists")
    .select("id, slug, name, avatar_url, category_id, languages, featured_priority")
    .in("id", featuredIds)
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

  let categoryById = new Map<string, { title: string | null; slug: string | null }>();
  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from("categories")
      .select("id, title, slug")
      .in("id", categoryIds);
    categoryById = new Map(
      (categories ?? []).map((category) => [
        String(category.id),
        {
          title: typeof category.title === "string" ? category.title : null,
          slug: typeof category.slug === "string" ? category.slug : null,
        },
      ])
    );
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
      name: displayName(row.name) ?? null,
      avatar_url: row.avatar_url ?? profile?.photo_url ?? null,
      city: profile?.city ?? null,
      languages: Array.isArray(row.languages) ? row.languages : [],
      category_title: category?.title ?? null,
      category_slug: category?.slug ?? null,
      featured_priority: row.featured_priority ?? 0,
    };
  });

  return jsonNoStore({ data });
}
