import { unstable_cache } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";

export type DashboardCategoryOption = {
  id: string;
  title: string;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
  parent_id: string | null;
  slug: string;
};

async function loadDashboardCategoryOptionsUncached(): Promise<DashboardCategoryOption[]> {
  const service = createSupabaseServerClient();
  const { data, error } = await service
    .from("categories")
    .select("id, title, title_ru, title_de, title_ua, parent_id, slug")
    .or(`parent_id.not.is.null,slug.eq.${UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG}`)
    .order("title", { ascending: true });

  if (error) {
    console.error("[dashboardCategoryOptions] failed to load categories", error);
    return [];
  }

  return (data ?? [])
    .filter(
      (category) =>
        typeof category?.id === "string" &&
        typeof category?.title === "string" &&
        (category.parent_id === null || typeof category.parent_id === "string") &&
        typeof category?.slug === "string",
    )
    .map((category) => {
      const row = category as {
        id: string;
        title: string;
        title_ru?: string | null;
        title_de?: string | null;
        title_ua?: string | null;
        parent_id: string | null;
        slug: string;
      };
      return {
        id: row.id,
        title: row.title,
        title_ru: row.title_ru,
        title_de: row.title_de,
        title_ua: row.title_ua,
        parent_id: row.parent_id,
        slug: row.slug,
      };
    });
}

/** Public/stable category tree for dashboard profile editor — shared across specialists. */
export const getDashboardCategoryOptions = unstable_cache(
  loadDashboardCategoryOptionsUncached,
  ["dashboard-category-options-v1"],
  { revalidate: 300 },
);
