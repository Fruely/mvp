import { NextRequest, NextResponse } from "next/server";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ACTIVE_REQUEST_STATUSES = ["new", "reviewing", "searching"] as const;
const MAX_ITEMS = 12;
const MAX_AGE_HOURS = 72;
const SUMMARY_MAX_LENGTH = 180;

type PromotionRow = {
  service_request_id: string;
  public_token: string;
  public_title: string;
  public_summary: string;
  published_at: string;
};

type RequestRow = {
  id: string;
  created_at: string;
  preferred_language: string | null;
  work_format: string | null;
  city: string | null;
  postal_code: string | null;
};

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function publicSummary(value: unknown): string {
  const normalized = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (normalized.length <= SUMMARY_MAX_LENGTH) return normalized;
  const shortened = normalized.slice(0, SUMMARY_MAX_LENGTH - 1);
  const wordBoundary = shortened.lastIndexOf(" ");
  return `${(wordBoundary > 100 ? shortened.slice(0, wordBoundary) : shortened).trimEnd()}…`;
}

function requestLang(request: NextRequest): Lang {
  const candidate = request.nextUrl.searchParams.get("lang")?.trim() ?? "";
  return isSupportedLang(candidate) ? candidate : "ru";
}

export async function GET(request: NextRequest) {
  try {
    const lang = requestLang(request);
    const supabase = createSupabaseServerClient();
    const since = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();

    // Only explicitly published, manually anonymized copy may reach this feed.
    // Raw descriptions and client contacts never leave service_requests.
    const { data: promotionRows, error: promotionError } = await supabase
      .from("service_request_promotions")
      .select("service_request_id, public_token, public_title, public_summary, published_at")
      .eq("status", "published")
      .eq("locale", lang)
      .is("closed_at", null)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(MAX_ITEMS * 2);

    if (promotionError) {
      console.error("[public/recent-service-requests] promotion query failed", promotionError);
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const promotions = (promotionRows ?? []) as PromotionRow[];
    const requestIds = promotions
      .map((row) => stringOrNull(row.service_request_id))
      .filter((value): value is string => Boolean(value));

    if (requestIds.length === 0) {
      return NextResponse.json(
        { items: [] },
        {
          status: 200,
          headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
        },
      );
    }

    const { data: requestRows, error: requestError } = await supabase
      .from("service_requests")
      .select("id, created_at, preferred_language, work_format, city, postal_code")
      .in("id", requestIds)
      .in("status", [...ACTIVE_REQUEST_STATUSES])
      .gte("created_at", since);

    if (requestError) {
      console.error("[public/recent-service-requests] request query failed", requestError);
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const requestById = new Map<string, RequestRow>();
    for (const row of (requestRows ?? []) as RequestRow[]) {
      requestById.set(row.id, row);
    }

    const items = promotions
      .map((promotion) => {
        const source = requestById.get(promotion.service_request_id);
        if (!source) return null;
        return {
          id: promotion.public_token,
          title: promotion.public_title.trim(),
          summary: publicSummary(promotion.public_summary),
          created_at: source.created_at,
          preferred_language: stringOrNull(source.preferred_language),
          work_format: stringOrNull(source.work_format),
          city: stringOrNull(source.city),
          postal_code: stringOrNull(source.postal_code),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item?.id && item.title && item.summary))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, MAX_ITEMS);

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
