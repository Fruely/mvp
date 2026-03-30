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

  const { data: popularData } = await supabase
    .from("homepage_popular_categories_view")
    .select("id, slug, title, image_url, specialists_count, sort_order")
    .order("sort_order", { ascending: true });

  const popularRows = ((popularData ?? []) as PopularCategoryItem[]).filter(
    (row) => typeof row.id === "string"
  );
  const seenIds = new Set(popularRows.map((r) => r.id));

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

  const extraCategoryIds = Array.from(countByCategory.keys()).filter((id) => !seenIds.has(id));

  if (extraCategoryIds.length > 0) {
    const { data: catData } = await supabase
      .from("categories")
      .select("id, slug, title, image_url")
      .in("id", extraCategoryIds);

    for (const cat of (catData ?? []) as Array<{ id: string; slug: string | null; title: string | null; image_url: string | null }>) {
      popularRows.push({
        id: cat.id,
        slug: cat.slug,
        title: cat.title,
        image_url: cat.image_url,
        specialists_count: countByCategory.get(cat.id) ?? 0,
        sort_order: null,
      });
    }
  }

  return jsonNoStore({ data: popularRows });
}

