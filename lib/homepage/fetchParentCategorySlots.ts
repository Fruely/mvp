import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function fetchHomepageParentCategorySlotSlugs(): Promise<string[]> {
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
          is_active,
          parent_id
        )
      `)
      .eq("is_active", true)
      .eq("categories.is_active", true)
      .is("categories.parent_id", null)
      .order("slot", { ascending: true });

    if (error || !Array.isArray(data)) {
      if (error) {
        console.error("[homepage/parent-category-slots] query", error);
      }
      return [];
    }

    return (data as any[])
      .filter(
        (row) =>
          row &&
          typeof row.slot === "number" &&
          typeof row.categories?.slug === "string" &&
          row.categories.slug.trim().length > 0
      )
      .sort((a, b) => Number(a.slot) - Number(b.slot))
      .map((row) => String(row.categories.slug).trim());
  } catch (err) {
    console.error("[homepage/parent-category-slots] unexpected", err);
    return [];
  }
}
