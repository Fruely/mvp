import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES = ["new", "reviewing", "searching"] as const;
const MAX_ITEMS = 12;
const MAX_AGE_HOURS = 72;

type CategoryRow = {
  id: string;
  title: string | null;
  title_ru: string | null;
  title_ua: string | null;
  title_de: string | null;
};

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    const since = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();

    const { data: requestRows, error: requestError } = await supabase
      .from("service_requests")
      .select("public_id, created_at, category_id, preferred_language, work_format, city")
      .in("status", [...ACTIVE_STATUSES])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(MAX_ITEMS);

    if (requestError) {
      console.error("[public/recent-service-requests] request query failed", requestError);
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const categoryIds = Array.from(
      new Set(
        (requestRows ?? [])
          .map((row) => stringOrNull(row.category_id))
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const categoryById = new Map<string, CategoryRow>();
    if (categoryIds.length > 0) {
      const { data: categoryRows, error: categoryError } = await supabase
        .from("categories")
        .select("id, title, title_ru, title_ua, title_de")
        .in("id", categoryIds);

      if (categoryError) {
        console.error("[public/recent-service-requests] category query failed", categoryError);
      } else {
        for (const row of (categoryRows ?? []) as CategoryRow[]) {
          categoryById.set(row.id, row);
        }
      }
    }

    const items = (requestRows ?? []).map((row) => {
      const categoryId = stringOrNull(row.category_id);
      const category = categoryId ? categoryById.get(categoryId) ?? null : null;
      return {
        id: String(row.public_id),
        created_at: String(row.created_at),
        preferred_language: stringOrNull(row.preferred_language),
        work_format: stringOrNull(row.work_format),
        city: stringOrNull(row.city),
        category: category
          ? {
              ru: category.title_ru ?? category.title ?? null,
              ua: category.title_ua ?? category.title ?? null,
              de: category.title_de ?? category.title ?? null,
            }
          : null,
      };
    });

    return NextResponse.json(
      { items },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("[public/recent-service-requests] unexpected error", error);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
