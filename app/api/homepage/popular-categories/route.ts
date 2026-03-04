import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServerClient();

  const { data: homepageRows, error: homepageError } = await supabase
    .from("homepage_popular_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .limit(10);

  if (homepageError) {
    console.error(
      "[homepage/popular-categories] failed to load homepage_popular_categories",
      homepageError
    );
    return jsonNoStore({ error: homepageError.message }, { status: 500 });
  }

  const normalizedHomepageRows = (homepageRows ?? []).map((row) => {
    const categoryId =
      row &&
      typeof row === "object" &&
      "category_id" in row &&
      typeof row.category_id === "string"
        ? row.category_id
        : null;
    const categorySlug =
      row &&
      typeof row === "object" &&
      "category_slug" in row &&
      typeof row.category_slug === "string"
        ? row.category_slug
        : row &&
            typeof row === "object" &&
            "slug" in row &&
            typeof row.slug === "string"
          ? row.slug
          : null;
    const sortOrder =
      row &&
      typeof row === "object" &&
      "sort_order" in row &&
      typeof row.sort_order === "number"
        ? row.sort_order
        : null;

    return { category_id: categoryId, category_slug: categorySlug, sort_order: sortOrder };
  });

  if (normalizedHomepageRows.length === 0) {
    return jsonNoStore({ data: [] });
  }

  const requestedCategoryIds = normalizedHomepageRows
    .map((item) => item.category_id)
    .filter((id): id is string => Boolean(id));
  const requestedCategorySlugs = normalizedHomepageRows
    .map((item) => item.category_slug)
    .filter((slug): slug is string => Boolean(slug));

  let categoriesQuery = supabase
    .from("categories")
    .select("id, slug, title, image_url, parent_id")
    .not("parent_id", "is", null);

  if (requestedCategoryIds.length > 0) {
    categoriesQuery = categoriesQuery.in("id", requestedCategoryIds);
  } else if (requestedCategorySlugs.length > 0) {
    categoriesQuery = categoriesQuery.in("slug", requestedCategorySlugs);
  }

  const { data: categories, error: categoriesError } = await categoriesQuery;
  if (categoriesError) {
    console.error("[homepage/popular-categories] failed to load categories", categoriesError);
    return jsonNoStore({ error: categoriesError.message }, { status: 500 });
  }

  const categoryList = categories ?? [];
  if (categoryList.length === 0) {
    return jsonNoStore({ data: [] });
  }

  const categoryIds = categoryList.map((category) => category.id);
  const categoryById = new Map(categoryList.map((category) => [category.id, category]));
  const categoryBySlug = new Map(
    categoryList
      .filter((category) => typeof category.slug === "string" && category.slug.trim().length > 0)
      .map((category) => [category.slug as string, category])
  );

  const { data: specialists, error: specialistsError } = await supabase
    .from("specialists")
    .select("category_id")
    .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
    .eq("is_active", true)
    .eq("is_visible", true)
    .neq("is_test", true)
    .in("category_id", categoryIds);

  if (specialistsError) {
    console.error("[homepage/popular-categories] failed to load specialists", specialistsError);
    return jsonNoStore({ error: specialistsError.message }, { status: 500 });
  }

  const specialistsCountByCategoryId = new Map<string, number>();
  for (const row of specialists ?? []) {
    const categoryId =
      row && typeof row.category_id === "string" ? row.category_id : null;
    if (!categoryId) continue;
    specialistsCountByCategoryId.set(
      categoryId,
      (specialistsCountByCategoryId.get(categoryId) ?? 0) + 1
    );
  }

  const data = normalizedHomepageRows
    .map((item) => {
      const category =
        (item.category_id ? categoryById.get(item.category_id) : undefined) ||
        (item.category_slug ? categoryBySlug.get(item.category_slug) : undefined);
      if (!category) return null;

      const specialistsCount = specialistsCountByCategoryId.get(category.id) ?? 0;
      if (specialistsCount < 1) return null;

      return {
        id: category.id,
        slug: category.slug,
        title: category.title,
        image_url: category.image_url,
        specialists_count: specialistsCount,
        sort_order: item.sort_order,
      };
    })
    .filter(
      (
        item
      ): item is {
        id: string;
        slug: string | null;
        title: string | null;
        image_url: string | null;
        specialists_count: number;
        sort_order: number | null;
      } => item !== null
    )
    .slice(0, 10);

  return jsonNoStore({ data });
}

