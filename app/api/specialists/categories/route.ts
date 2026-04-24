import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CACHE_PUBLIC_SPECIALISTS_CATEGORIES } from "@/lib/http/cache";
import { getPublicSpecialistCountsByServiceCategory } from "@/lib/specialists/publicCategoryCounts";

export const dynamic = "force-dynamic";

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

function parsePositiveInt(value: string | null | undefined): number | null {
  if (!value) return null;
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}

function isCategoryClickable(specialistsCount: number, minCount: number): boolean {
  // Keep empty categories visible in API while preventing dead links in UI.
  return specialistsCount > 0 && specialistsCount >= minCount;
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryMinCount = parsePositiveInt(searchParams.get("min_count"));
    const minCount = queryMinCount ?? 0;
    const mode = searchParams.get("mode") === "parents" ? "parents" : "children";
    const includeChildren = searchParams.get("include_children") === "1";

    const {
      categories: rawCategories,
      hasHierarchy,
      supabase,
    } = await loadCategoriesWithOptionalHierarchy();

    const normalizedCategories = (rawCategories ?? []).filter(
      (category) =>
        typeof category?.id === "string" &&
        typeof category?.slug === "string" &&
        category.slug.trim().length > 0
    );

    const childCategories =
      hasHierarchy && normalizedCategories.some((category) => category.parent_id)
        ? normalizedCategories.filter((category) => typeof category.parent_id === "string")
        : normalizedCategories;

    const categoryIds = childCategories.map((c) => c.id);
    let countsByCategoryId = new Map<string, number>();

    if (categoryIds.length > 0) {
      try {
        countsByCategoryId = await getPublicSpecialistCountsByServiceCategory(
          supabase,
          categoryIds
        );
      } catch (error) {
        console.error("[specialists/categories] specialists", error);
        return NextResponse.json(
          { error: "Failed to load specialists counts" },
          {
            status: 500,
            headers: { "Cache-Control": "no-store, max-age=0" },
          }
        );
      }
    }

    if (mode === "children") {
      const data = childCategories.map((category) => {
        const specialistsCount = countsByCategoryId.get(category.id) ?? 0;
        return {
          id: category.id,
          slug: category.slug,
          title: category.title,
          title_ru: category.title_ru ?? null,
          title_de: category.title_de ?? null,
          title_ua: category.title_ua ?? null,
          parent_id: category.parent_id ?? null,
          image_url: category.image_url ?? null,
          specialists_count: specialistsCount,
          is_clickable: isCategoryClickable(specialistsCount, minCount),
        };
      });

      const meta: Record<string, unknown> = {
        min_count: minCount,
        mode,
        hierarchy_enabled: hasHierarchy,
      };
      return NextResponse.json(
        { data, meta },
        {
          headers: { "Cache-Control": CACHE_PUBLIC_SPECIALISTS_CATEGORIES },
        }
      );
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

    const parentData = parentCandidates.map((parent) => {
        const children = childrenByParentId.get(parent.id) ?? [];

        const mappedChildren = children.map((child) => {
          const specialistsCount = countsByCategoryId.get(child.id) ?? 0;
          return {
            id: child.id,
            slug: child.slug,
            title: child.title,
            title_ru: child.title_ru ?? null,
            title_de: child.title_de ?? null,
            title_ua: child.title_ua ?? null,
            image_url: child.image_url ?? null,
            specialists_count: specialistsCount,
            is_clickable: isCategoryClickable(specialistsCount, minCount),
          };
        });

        const parentCount = mappedChildren.reduce(
          (sum, child) => sum + child.specialists_count,
          0
        );

        return {
          id: parent.id,
          slug: parent.slug,
          title: parent.title,
          title_ru: parent.title_ru ?? null,
          title_de: parent.title_de ?? null,
          title_ua: parent.title_ua ?? null,
          parent_id: null,
          image_url: parent.image_url ?? null,
          specialists_count: parentCount,
          is_clickable: isCategoryClickable(parentCount, minCount),
          ...(includeChildren ? { children: mappedChildren } : {}),
        };
      });

    const meta: Record<string, unknown> = {
      min_count: minCount,
      mode,
      hierarchy_enabled: hasHierarchy,
    };

    return NextResponse.json(
      {
        data: parentData,
        meta,
      },
      {
        headers: { "Cache-Control": CACHE_PUBLIC_SPECIALISTS_CATEGORIES },
      }
    );
  } catch (err: unknown) {
    console.error("[specialists/categories] unexpected", err);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }
}
