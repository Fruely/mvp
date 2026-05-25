import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { jsonWithCache } from "@/lib/http/cache";

const CACHE_PUBLIC_HOMEPAGE_PARENT_SLOTS =
  "public, s-maxage=300, stale-while-revalidate=1800";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createSupabaseServerClient();

  try {
    const { data, error } = await supabase
      .from("homepage_parent_category_slots")
      .select(`
        slot,
        category_id,
        is_active,
        categories!inner (
          slug,
          title,
          title_ru,
          title_de,
          title_ua,
          is_active,
          parent_id
        )
      `)
      .eq("is_active", true)
      .eq("categories.is_active", true)
      .is("categories.parent_id", null)
      .order("slot", { ascending: true });

    if (error) {
      console.error("[api/homepage/parent-category-slots] query", error);
      return jsonNoStore({ slots: [] });
    }

    if (!Array.isArray(data)) {
      return jsonNoStore({ slots: [] });
    }

    const slots = data.map((row: any) => ({
      slot: row.slot,
      category_id: row.category_id,
      slug: row.categories?.slug ?? null,
      title: row.categories?.title ?? null,
      title_ru: row.categories?.title_ru ?? null,
      title_ua: row.categories?.title_ua ?? null,
      title_de: row.categories?.title_de ?? null,
    }));

    return jsonWithCache({ slots }, CACHE_PUBLIC_HOMEPAGE_PARENT_SLOTS);
  } catch (err) {
    console.error("[api/homepage/parent-category-slots] unexpected", err);
    return jsonNoStore({ slots: [] });
  }
}
