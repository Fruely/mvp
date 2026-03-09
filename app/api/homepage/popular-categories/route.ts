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

type JoinedCategory = {
  id: string;
  slug: string | null;
  title: string | null;
  image_url: string | null;
  parent_id: string | null;
};

type HomepagePopularRow = {
  sort_order: number | null;
  category_id: string | null;
  categories: JoinedCategory | JoinedCategory[] | null;
};

type CountRow = {
  category_id: string | null;
  specialists_count: number | null;
};

export async function GET() {
  const supabase = createSupabaseServerClient();

  const { data: rows, error } = await supabase
    .from("homepage_popular_categories")
    .select(`
      sort_order,
      category_id,
      categories!inner (
        id,
        slug,
        title,
        image_url,
        parent_id
      )
    `)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    return jsonNoStore({ error: error.message }, { status: 500 });
  }

  const categoryRows = ((rows ?? []) as HomepagePopularRow[])
    .map((r) => {
      const category = Array.isArray(r.categories) ? r.categories[0] : r.categories;
      if (!category) return null;

      return {
        sort_order: typeof r.sort_order === "number" ? r.sort_order : null,
        category,
      };
    })
    .filter(
      (
        r
      ): r is {
        sort_order: number | null;
        category: JoinedCategory;
      } =>
        Boolean(
          r &&
          r.category &&
          typeof r.category.id === "string" &&
          typeof r.category.parent_id === "string" &&
          r.category.parent_id.trim().length > 0
        )
    );

  if (categoryRows.length === 0) {
    return jsonNoStore({ data: [] });
  }

  const ids = categoryRows.map((r) => r.category.id);

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
    .map(({ sort_order, category }): PopularCategoryItem => ({
      id: category.id,
      slug: category.slug,
      title: category.title,
      image_url: category.image_url ?? null,
      specialists_count: counts.get(category.id) ?? 0,
      sort_order,
    }))
    .filter((item) => item.specialists_count > 0)
  ) {
    if (!unique.has(item.id)) {
      unique.set(item.id, item);
    }
  }

  const data = Array.from(unique.values());

  return jsonNoStore({ data });
}

