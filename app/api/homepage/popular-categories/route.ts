import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { getPublicSpecialistCountsByServiceCategory } from "@/lib/specialists/publicCategoryCounts";

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

  const categoriesQuery = supabase
    .from("categories")
    .select("id, slug, title, image_url, parent_id")
    .not("parent_id", "is", null);

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

  let specialistsCountByCategoryId: Map<string, number>;
  try {
    specialistsCountByCategoryId = await getPublicSpecialistCountsByServiceCategory(
      supabase,
      categoryIds
    );
  } catch (error) {
    console.error("[homepage/popular-categories] failed to load specialists", error);
    const message = error instanceof Error ? error.message : "Failed to load specialists";
    return jsonNoStore({ error: message }, { status: 500 });
  }

  const dataByManualOrder = normalizedHomepageRows
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
    );

  const seenCategoryIds = new Set<string>();
  const manualOrdered = dataByManualOrder
    .filter((item) => {
      if (seenCategoryIds.has(item.id)) return false;
      seenCategoryIds.add(item.id);
      return true;
    })
    .sort((a, b) => {
      const aOrder = typeof a.sort_order === "number" ? a.sort_order : Number.MAX_SAFE_INTEGER;
      const bOrder = typeof b.sort_order === "number" ? b.sort_order : Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.title?.localeCompare(b.title ?? "", "uk") ?? 0;
    });

  // Auto-fill the block with top categories so funnel does not depend on manual rows only.
  const autoCandidates = categoryList
    .map((category) => {
      if (seenCategoryIds.has(category.id)) return null;
      const specialistsCount = specialistsCountByCategoryId.get(category.id) ?? 0;
      if (specialistsCount < 1) return null;
      return {
        id: category.id,
        slug: category.slug,
        title: category.title,
        image_url: category.image_url,
        specialists_count: specialistsCount,
        sort_order: null,
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
    .sort((a, b) => {
      if (a.specialists_count !== b.specialists_count) {
        return b.specialists_count - a.specialists_count;
      }
      return a.title?.localeCompare(b.title ?? "", "uk") ?? 0;
    });

  const data = [...manualOrdered, ...autoCandidates].slice(0, 10);

  return jsonNoStore({ data });
}

