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

export async function GET() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("homepage_popular_categories_view")
    .select("id, slug, title, image_url, specialists_count, sort_order");

  if (error) {
    return jsonNoStore({ error: error.message }, { status: 500 });
  }

  const rows = ((data ?? []) as PopularCategoryItem[]).filter(
    (row) =>
      typeof row.id === "string" &&
      typeof row.slug === "string" &&
      row.slug.trim().length > 0
  );

  return jsonNoStore({ data: rows });
}

