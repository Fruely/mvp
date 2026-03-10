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

type CountRow = {
  category_id: string | null;
  specialists_count: number | null;
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

  const { data: countsRows, error: countsError } = await supabase
    .from("category_specialist_counts")
    .select("category_id, specialists_count")
    .in("category_id", ids);

  if (countsError) {
    return jsonNoStore({ error: countsError.message }, { status: 500 });
  }

  const counts = new Map(
    ((countsRows ?? []) as CountRow[])
      .filter(
        (row): row is { category_id: string; specialists_count: number } =>
          typeof row.category_id === "string" && typeof row.specialists_count === "number"
      )
      .map((row) => [row.category_id, row.specialists_count])
  );

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

