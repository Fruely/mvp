import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Exact catalogue identity for a client-supplied category label.
 *
 * Titles come from `v_searchable_categories`, which already keeps only active
 * child categories. Terms come from active `category_search_terms` and count
 * only when their category is in that same set. Matching is equality after
 * trim and lowercase. Prefix, substring and popularity never choose an id.
 */
export type ExactCategoryResolution =
  | { status: "resolved"; categoryId: string }
  | { status: "unresolved" }
  | { status: "error" };

type CategoryTitleRow = {
  category_id?: string | null;
  title?: string | null;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
};

type TermRow = {
  category_id?: string | null;
  term?: string | null;
  is_active?: boolean | null;
};

export function normalizeExactCategoryText(value: string): string {
  return value.trim().toLowerCase();
}

function sameText(value: unknown, query: string): boolean {
  return typeof value === "string" && normalizeExactCategoryText(value) === query;
}

export async function resolveExactCategoryId(
  supabase: SupabaseClient,
  categoryText: string,
): Promise<ExactCategoryResolution> {
  const query = normalizeExactCategoryText(categoryText);
  if (!query) return { status: "unresolved" };

  const [categoriesResult, termsResult] = await Promise.all([
    supabase
      .from("v_searchable_categories")
      .select("category_id, title, title_ru, title_de, title_ua"),
    supabase
      .from("category_search_terms")
      .select("category_id, term, is_active")
      .eq("is_active", true),
  ]);

  if (categoriesResult.error || termsResult.error) {
    return { status: "error" };
  }

  const activeIds = new Set<string>();
  const matched = new Set<string>();

  for (const row of (categoriesResult.data ?? []) as CategoryTitleRow[]) {
    const id = typeof row.category_id === "string" ? row.category_id : "";
    if (!id) continue;
    activeIds.add(id);
    if (
      sameText(row.title, query) ||
      sameText(row.title_ru, query) ||
      sameText(row.title_de, query) ||
      sameText(row.title_ua, query)
    ) {
      matched.add(id);
    }
  }

  for (const row of (termsResult.data ?? []) as TermRow[]) {
    const id = typeof row.category_id === "string" ? row.category_id : "";
    if (!id || !activeIds.has(id) || row.is_active === false) continue;
    if (sameText(row.term, query)) matched.add(id);
  }

  if (matched.size === 1) {
    const [categoryId] = Array.from(matched);
    return { status: "resolved", categoryId };
  }
  return { status: "unresolved" };
}
