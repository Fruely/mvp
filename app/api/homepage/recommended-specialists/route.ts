import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";

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
    .eq("status", "published_verified")
    .limit(10);

  if (featuredError) {
    return jsonNoStore({ error: featuredError.message }, { status: 500 });
  }

  const featuredIds = (featuredRows ?? [])
    .map((row) => (row && typeof row.id === "string" ? row.id : null))
    .filter((id): id is string => Boolean(id));

  if (featuredIds.length === 0) return jsonNoStore({ data: [] });

  const { data: rows, error } = await supabase
    .from("search_specialists")
    .select("*")
    .in("id", featuredIds)
    .limit(10);

  if (error) {
    return jsonNoStore({ error: error.message }, { status: 500 });
  }

  const specialists = rows ?? [];
  if (specialists.length === 0) return jsonNoStore({ data: [] });

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
        { title: typeof category.title === "string" ? category.title : null, slug: typeof category.slug === "string" ? category.slug : null },
      ])
    );
  }

  const grouped = new Map<number, typeof specialists>();
  for (const specialist of specialists) {
    const priority = Number.isFinite(specialist.featured_priority) ? Number(specialist.featured_priority) : 0;
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
    const category = typeof row.category_id === "string" ? categoryById.get(row.category_id) : undefined;
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      avatar_url: row.avatar_url,
      city: row.city,
      languages: Array.isArray(row.languages) ? row.languages : [],
      category_title: category?.title ?? null,
      category_slug: category?.slug ?? null,
      featured_priority: row.featured_priority ?? 0,
    };
  });

  return jsonNoStore({ data });
}
