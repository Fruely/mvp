import { createSupabaseServerClient } from "@/lib/supabase/server";
import { matchCategoryAsciiSlug } from "@/lib/categories/matchCategoryAsciiSlug";
import { toPublicCategorySlug } from "@/lib/publicUrls";

export async function resolveCategoryAsciiSlug(
  requested: string,
): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("slug, title, title_ru, title_ua, title_de")
    .not("slug", "is", null);

  if (error || !data) return toPublicCategorySlug(requested);
  return matchCategoryAsciiSlug(requested, data);
}
