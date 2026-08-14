import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";
import { getPublicSpecialistCountsByServiceCategory } from "@/lib/specialists/publicCategoryCounts";
import type { HomepageCategoryStat } from "@/lib/homepage/types";

type CategoryRow = {
  id: string;
  slug: string | null;
  title: string | null;
  title_ru?: string | null;
  title_de?: string | null;
  title_ua?: string | null;
  parent_id?: string | null;
  image_url?: string | null;
};

function isCategoryClickable(specialistsCount: number): boolean {
  return specialistsCount > 0;
}

async function loadCategoriesWithOptionalHierarchy() {
  const supabase = createSupabaseServerClient();

  const withParent = await supabase
    .from("categories")
    .select("id, slug, title, title_ru, title_de, title_ua, parent_id, image_url")
    .order("title", { ascending: true });

  if (!withParent.error) {
    return {
      categories: (withParent.data ?? []) as CategoryRow[],
      hasHierarchy: true,
      supabase,
    };
  }

  const fallback = await supabase
    .from("categories")
    .select("id, slug, title, title_ru, title_de, title_ua, image_url")
    .order("title", { ascending: true });

  if (fallback.error) {
    throw fallback.error;
  }

  return {
    categories: ((fallback.data ?? []) as CategoryRow[]).map((category) => ({
      ...category,
      parent_id: null,
    })),
    hasHierarchy: false,
    supabase,
  };
}

export async function fetchHomepageParentCategories(): Promise<HomepageCategoryStat[]> {
  const { categories: rawCategories, hasHierarchy, supabase } =
    await loadCategoriesWithOptionalHierarchy();

  const normalizedCategories = (rawCategories ?? []).filter(
    (category) =>
      typeof category?.id === "string" &&
      typeof category?.slug === "string" &&
      category.slug.trim().length > 0 &&
      category.slug !== UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG
  );

  const childCategories =
    hasHierarchy && normalizedCategories.some((category) => category.parent_id)
      ? normalizedCategories.filter((category) => typeof category.parent_id === "string")
      : normalizedCategories;

  const categoryIds = childCategories.map((c) => c.id);
  let countsByCategoryId = new Map<string, number>();

  if (categoryIds.length > 0) {
    countsByCategoryId = await getPublicSpecialistCountsByServiceCategory(supabase, categoryIds);
  }

  const childrenByParentId = new Map<string, CategoryRow[]>();
  for (const child of childCategories) {
    if (!child.parent_id) continue;
    const list = childrenByParentId.get(child.parent_id) ?? [];
    list.push(child);
    childrenByParentId.set(child.parent_id, list);
  }

  const parentCandidates = hasHierarchy
    ? normalizedCategories.filter((category) => !category.parent_id)
    : [];

  if (parentCandidates.length === 0) {
    return childCategories.map((category) => {
      const specialistsCount = countsByCategoryId.get(category.id) ?? 0;
      return {
        id: category.id,
        slug: String(category.slug),
        title: category.title,
        title_ru: category.title_ru ?? null,
        title_de: category.title_de ?? null,
        title_ua: category.title_ua ?? null,
        parent_id: category.parent_id ?? null,
        specialists_count: specialistsCount,
        is_clickable: isCategoryClickable(specialistsCount),
      };
    });
  }

  return parentCandidates.map((parent) => {
    const children = childrenByParentId.get(parent.id) ?? [];
    const mappedChildren = children.map((child) => {
      const specialistsCount = countsByCategoryId.get(child.id) ?? 0;
      return {
        id: child.id,
        slug: String(child.slug),
        title: child.title,
        title_ru: child.title_ru ?? null,
        title_de: child.title_de ?? null,
        title_ua: child.title_ua ?? null,
        image_url: child.image_url ?? null,
        specialists_count: specialistsCount,
        is_clickable: isCategoryClickable(specialistsCount),
      };
    });

    const parentCount = mappedChildren.reduce((sum, child) => sum + child.specialists_count, 0);

    return {
      id: parent.id,
      slug: String(parent.slug),
      title: parent.title,
      title_ru: parent.title_ru ?? null,
      title_de: parent.title_de ?? null,
      title_ua: parent.title_ua ?? null,
      parent_id: null,
      specialists_count: parentCount,
      is_clickable: isCategoryClickable(parentCount),
      children: mappedChildren,
    };
  });
}
