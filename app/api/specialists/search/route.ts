import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { jsonNoStore } from "@/lib/api/response";
import { VISIBLE_PUBLIC_SPECIALIST_STATUSES } from "@/lib/specialists/status";

export const dynamic = "force-dynamic";

type CategoryRow = { id: string; slug: string; title: string | null };

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang")?.trim() || null;
    const place = searchParams.get("place")?.trim() || null;
    const category = searchParams.get("category")?.trim() || null;
    const offsetRaw = Number.parseInt(searchParams.get("offset") ?? "0", 10);
    const offset = Number.isFinite(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;

    const supabase = createSupabaseServerClient();

    // Resolve category slug → id
    let categoryId: string | null = null;
    if (category) {
      const { data: categoryRow } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", category)
        .maybeSingle();
      if (!categoryRow?.id) {
        return jsonNoStore({ data: [] });
      }
      categoryId = categoryRow.id;
    }

    // Build query with SQL filters
    const selectCols =
      "id, name, bio, avatar_url, category_id, languages, work_format, postal_code";

    let query = supabase
      .from("specialists")
      .select(selectCols)
      .in("status", [...VISIBLE_PUBLIC_SPECIALIST_STATUSES])
      .eq("is_active", true)
      .eq("is_visible", true);

    // Filter by language (Postgres array contains)
    if (lang) {
      query = query.contains("languages", [lang]);
    }

    // Filter by postal code
    if (place) {
      query = query.eq("postal_code", place);
    }

    // Filter by category via category_id
    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    // Pagination
    query = query.range(offset, offset + 19).limit(20);

    const { data: rows, error: specError } = await query;

    if (specError) {
      console.error("[specialists/search] specialists fetch:", specError);
      return jsonNoStore(
        { error: "Failed to fetch specialists" },
        { status: 500 }
      );
    }

    const specialists = (rows ?? []) as Array<{
      id: string;
      name: string | null;
      bio: string | null;
      avatar_url: string | null;
      category_id: string | null;
      languages: string[] | null;
      work_format: string | null;
      postal_code: string | null;
    }>;

    // Fetch category metadata for results
    const categoryIds = Array.from(
      new Set(
        specialists.map((s) => s.category_id).filter((id): id is string => Boolean(id))
      )
    );

    let categoryMap: Record<string, CategoryRow> = {};
    if (categoryIds.length > 0) {
      const { data: cats } = await supabase
        .from("categories")
        .select("id, slug, title")
        .in("id", categoryIds);
      (cats ?? []).forEach((c: CategoryRow) => {
        categoryMap[c.id] = c;
      });
    }

    const data = specialists.map((s) => {
      const cat = s.category_id ? categoryMap[s.category_id] : null;
      return {
        id: s.id,
        name: typeof s.name === "string" && s.name.trim() ? s.name.trim() : null,
        bio: s.bio,
        avatar_url: s.avatar_url,
        category_id: s.category_id,
        category_slug: cat?.slug ?? null,
        category_title: cat?.title ?? null,
        languages: s.languages ?? [],
        work_format: s.work_format ?? "online",
        postal_code: s.postal_code,
      };
    });

    return jsonNoStore({ data });
  } catch (e: any) {
    console.error("[specialists/search] unexpected:", e);
    return jsonNoStore(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
