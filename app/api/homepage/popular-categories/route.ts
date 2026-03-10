import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";

export const dynamic = "force-dynamic";

type PopularCategoryItem = {
  id: string;
  slug: string | null;
  title: string | null;
  image_url: string | null;
  specialists_count: number;
  sort_order: number | null;
};

type CategoryRow = {
  id: string;
  slug: string | null;
  title: string | null;
  image_url: string | null;
};

type SpecialistCountRow = {
  category_id: string | null;
  id: string;
};

export async function GET() {
  const supabase = createSupabaseServerClient();

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, slug, title, image_url")
    .eq("is_active", true)
    .not("image_url", "is", null)
    .order("title", { ascending: true });

  if (error) {
    return jsonNoStore({ error: error.message }, { status: 500 });
  }

  const categoryRows = ((categories ?? []) as CategoryRow[]).filter(
    (row): row is CategoryRow =>
      typeof row.id === "string" &&
      typeof row.slug === "string" &&
      row.slug.trim().length > 0 &&
      (typeof row.title === "string" || row.title == null) &&
      (typeof row.image_url === "string" || row.image_url == null)
  );

  if (categoryRows.length === 0) {
    return jsonNoStore({ data: [] });
  }

  const ids = categoryRows.map((r) => r.id);

  const { data: specialistsRows, error: specialistsError } = await supabase
    .from("specialists")
    .select("id, category_id")
    .in("category_id", ids)
    .eq("is_active", true)
    .eq("is_visible", true);

  if (specialistsError) {
    return jsonNoStore({ error: specialistsError.message }, { status: 500 });
  }

  const counts = new Map<string, number>();
  for (const row of (specialistsRows ?? []) as SpecialistCountRow[]) {
    if (typeof row.category_id !== "string") continue;
    counts.set(row.category_id, (counts.get(row.category_id) ?? 0) + 1);
  }

  const unique = new Map<string, PopularCategoryItem>();

  for (const item of categoryRows
    .map((category): PopularCategoryItem => ({
      id: category.id,
      slug: category.slug,
      title: category.title,
      image_url: category.image_url ?? null,
      specialists_count: counts.get(category.id) ?? 0,
      sort_order: null,
    }))
  ) {
    if (!unique.has(item.id)) {
      unique.set(item.id, item);
    }
  }

  const data = Array.from(unique.values());

  return jsonNoStore({ data });
}

