import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export const dynamic = "force-dynamic";

type PopularCategoryItem = {
  id: string;
  slug: string | null;
  title: string | null;
  image_url: string | null;
  specialists_count: number;
  sort_order: number | null;
};

export async function GET() {
  const supabase = createSupabaseServerClient();

  // 1. Count specialists per category
  const { data: serviceData } = await supabase
    .from("specialist_services")
    .select(`
      category_id,
      specialist_id,
      specialists!inner ( status, is_active, is_visible, is_test )
    `)
    .eq("is_active", true)
    .in("specialists.status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
    .eq("specialists.is_active", true)
    .eq("specialists.is_visible", true);

  const countByCategory = new Map<string, number>();
  const seenPairs = new Set<string>();
  for (const row of (serviceData ?? []) as Array<{ category_id: string | null; specialist_id: string | null; specialists?: { is_test?: boolean | null } | Array<{ is_test?: boolean | null }> | null }>) {
    const spec = Array.isArray(row.specialists) ? row.specialists[0] : row.specialists;
    if (spec?.is_test) continue;
    if (!row.category_id || !row.specialist_id) continue;
    const key = `${row.category_id}:${row.specialist_id}`;
    if (seenPairs.has(key)) continue;
    seenPairs.add(key);
    countByCategory.set(row.category_id, (countByCategory.get(row.category_id) ?? 0) + 1);
  }

  const activeCategoryIds = Array.from(countByCategory.keys());
  if (activeCategoryIds.length === 0) {
    return jsonNoStore({ data: [] });
  }

  // 2. Fetch categories that have specialists
  const { data: catData } = await supabase
    .from("categories")
    .select("id, slug, title, image_url")
    .in("id", activeCategoryIds);

  // 3. Optional: get sort_order from homepage_popular_categories_view
  const { data: popularData } = await supabase
    .from("homepage_popular_categories_view")
    .select("id, sort_order");

  const sortOrderById = new Map<string, number>();
  for (const row of (popularData ?? []) as Array<{ id: string; sort_order: number | null }>) {
    if (typeof row.sort_order === "number") {
      sortOrderById.set(row.id, row.sort_order);
    }
  }

  // 4. Build result: only categories with image_url
  const rows: PopularCategoryItem[] = ((catData ?? []) as Array<{ id: string; slug: string | null; title: string | null; image_url: string | null }>)
    .filter((cat) => cat.image_url)
    .map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      title: cat.title,
      image_url: cat.image_url,
      specialists_count: countByCategory.get(cat.id) ?? 0,
      sort_order: sortOrderById.get(cat.id) ?? null,
    }));

  // 5. Sort: curated first (by sort_order), then by specialists_count desc
  rows.sort((a, b) => {
    const aOrder = a.sort_order ?? 9999;
    const bOrder = b.sort_order ?? 9999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return b.specialists_count - a.specialists_count;
  });

  return jsonNoStore({ data: rows });
}

