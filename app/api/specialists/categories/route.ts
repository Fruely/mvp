import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CategoryRow = {
  id: string;
  slug: string | null;
  title: string | null;
  parent_id?: string | null;
};

function parsePositiveInt(value: string | null | undefined): number | null {
  if (!value) return null;
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}

async function loadCategoriesWithOptionalHierarchy() {
  const supabase = createSupabaseServerClient();

  const withParent = await supabase
    .from("categories")
    .select("id, slug, title, parent_id")
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
    .select("id, slug, title")
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
    const envMinCount =
      parsePositiveInt(process.env.CATEGORY_MIN_SPECIALISTS) ??
      parsePositiveInt(process.env.NEXT_PUBLIC_CATEGORY_MIN_COUNT);
    const minCount = queryMinCount ?? envMinCount ?? 1;
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
      const { data: specialists, error: specialistsError } = await supabase
        .from("specialists")
        .select("category_id")
        .eq("status", "approved")
        .eq("is_active", true)
        .eq("is_visible", true)
        .in("category_id", categoryIds);

      if (specialistsError) {
        console.error("[specialists/categories] specialists", specialistsError);
        return NextResponse.json(
          { error: "Failed to load specialists counts" },
          { status: 500 }
        );
      }

      countsByCategoryId = (specialists ?? []).reduce((acc, row) => {
        const categoryId =
          row && typeof row.category_id === "string" ? row.category_id : null;
        if (!categoryId) return acc;
        acc.set(categoryId, (acc.get(categoryId) ?? 0) + 1);
        return acc;
      }, new Map<string, number>());
    }

    if (mode === "children") {
      const data = childCategories.map((category) => {
        const specialistsCount = countsByCategoryId.get(category.id) ?? 0;
        return {
          id: category.id,
          slug: category.slug,
          title: category.title,
          parent_id: category.parent_id ?? null,
          specialists_count: specialistsCount,
          is_clickable: specialistsCount >= minCount,
        };
      });

      return NextResponse.json({
        data,
        meta: { min_count: minCount, mode, hierarchy_enabled: hasHierarchy },
      });
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

    const parentData = parentCandidates
      .map((parent) => {
        const children = childrenByParentId.get(parent.id) ?? [];
        if (!children.length) return null;

        const mappedChildren = children.map((child) => {
          const specialistsCount = countsByCategoryId.get(child.id) ?? 0;
          return {
            id: child.id,
            slug: child.slug,
            title: child.title,
            specialists_count: specialistsCount,
            is_clickable: specialistsCount >= minCount,
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
          parent_id: null,
          specialists_count: parentCount,
          is_clickable: parentCount >= minCount,
          ...(includeChildren ? { children: mappedChildren } : {}),
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      data: parentData,
      meta: { min_count: minCount, mode, hierarchy_enabled: hasHierarchy },
    });
  } catch (err: unknown) {
    console.error("[specialists/categories] unexpected", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
