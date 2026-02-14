import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function parsePositiveInt(value: string | null | undefined): number | null {
  if (!value) return null;
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num) || num < 0) return null;
  return num;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryMinCount = parsePositiveInt(searchParams.get("min_count"));
    const envMinCount =
      parsePositiveInt(process.env.CATEGORY_MIN_SPECIALISTS) ??
      parsePositiveInt(process.env.NEXT_PUBLIC_CATEGORY_MIN_COUNT);
    const minCount = queryMinCount ?? envMinCount ?? 1;

    const supabase = createSupabaseServerClient();

    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select("id, slug, title")
      .order("title", { ascending: true });

    if (categoriesError) {
      console.error("[specialists/categories] categories", categoriesError);
      return NextResponse.json(
        { error: "Failed to load categories" },
        { status: 500 }
      );
    }

    const normalizedCategories = (categories ?? []).filter(
      (category) =>
        typeof category?.id === "string" &&
        typeof category?.slug === "string" &&
        category.slug.trim().length > 0
    );

    const categoryIds = normalizedCategories.map((c) => c.id);
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

    const data = normalizedCategories.map((category) => {
      const specialistsCount = countsByCategoryId.get(category.id) ?? 0;
      return {
        ...category,
        specialists_count: specialistsCount,
        is_clickable: specialistsCount >= minCount,
      };
    });

    return NextResponse.json({ data, meta: { min_count: minCount } });
  } catch (err: unknown) {
    console.error("[specialists/categories] unexpected", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
