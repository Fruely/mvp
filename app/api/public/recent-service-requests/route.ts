import { NextRequest, NextResponse } from "next/server";
import { publicCategoryLabel } from "@/lib/homepage/liveDemandCategory";
import { isSupportedLang, type Lang } from "@/lib/i18n";
import {
  LIVE_DEMAND_ACTIVE_STATUSES,
  LIVE_DEMAND_MAX_AGE_HOURS,
  mapLiveDemandCard,
} from "@/lib/serviceRequests/localizedPublicCopy";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ACTIVE_REQUEST_STATUSES = LIVE_DEMAND_ACTIVE_STATUSES;
const MAX_ITEMS = 12;
const MAX_AGE_HOURS = LIVE_DEMAND_MAX_AGE_HOURS;
const SUMMARY_MAX_LENGTH = 180;

type PromotionRow = {
  service_request_id: string;
  public_token: string;
  public_title: string;
  public_summary: string;
  published_at: string;
  locale: string;
  localized_copy: unknown;
};

type RequestRow = {
  id: string;
  created_at: string;
  status: string | null;
  preferred_language: string | null;
  work_format: string | null;
  city: string | null;
  postal_code: string | null;
  category_id: string | null;
  category_text: string | null;
};

type CategoryRow = {
  id: string;
  slug: string | null;
  title: string | null;
  title_ru: string | null;
  title_de: string | null;
  title_ua: string | null;
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
    // Do not filter by promotion locale: a RU homepage must still show a UA card.
    const { data: promotionRows, error: promotionError } = await supabase
      .from("service_request_promotions")
      .select("service_request_id, public_token, public_title, public_summary, published_at, locale, localized_copy")
      .eq("status", "published")
      .is("closed_at", null)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(MAX_ITEMS * 2);

    const missingLocalizedCopy =
      Boolean(promotionError?.message?.includes("localized_copy")) &&
      /column|schema cache/i.test(promotionError?.message ?? "");

    const { data: fallbackPromotionRows, error: fallbackPromotionError } = missingLocalizedCopy
      ? await supabase
          .from("service_request_promotions")
          .select("service_request_id, public_token, public_title, public_summary, published_at, locale")
          .eq("status", "published")
          .is("closed_at", null)
          .not("published_at", "is", null)
          .order("published_at", { ascending: false })
          .limit(MAX_ITEMS * 2)
      : { data: null, error: null };

    const resolvedPromotionError = missingLocalizedCopy ? fallbackPromotionError : promotionError;
    const promotions = ((missingLocalizedCopy ? fallbackPromotionRows : promotionRows) ?? []) as PromotionRow[];

    if (resolvedPromotionError) {
      console.error("[public/recent-service-requests] promotion query failed", resolvedPromotionError);
      return NextResponse.json({ items: [] }, { status: 200 });
    }
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
      .select("id, created_at, status, preferred_language, work_format, city, postal_code, category_id, category_text")
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

    const categoryIds = Array.from(
      new Set(
        Array.from(requestById.values())
          .map((row) => stringOrNull(row.category_id))
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const categoryById = new Map<string, CategoryRow>();
    if (categoryIds.length > 0) {
      const { data: categoryRows, error: categoryError } = await supabase
        .from("categories")
        .select("id, slug, title, title_ru, title_de, title_ua")
        .in("id", categoryIds);
      if (categoryError) {
        console.error("[public/recent-service-requests] category query failed", categoryError);
      } else {
        for (const row of (categoryRows ?? []) as CategoryRow[]) {
          categoryById.set(row.id, row);
        }
      }
    }

    const items = promotions
      .map((promotion) => {
        const source = requestById.get(promotion.service_request_id);
        if (!source) return null;
        const categoryId = stringOrNull(source.category_id);
        const card = mapLiveDemandCard({
          pageLang: lang,
          publicToken: promotion.public_token,
          publicTitle: promotion.public_title,
          publicSummary: promotion.public_summary,
          localizedCopy: promotion.localized_copy,
          sourceLocale: promotion.locale,
          preferredLanguage: stringOrNull(source.preferred_language),
          createdAt: source.created_at,
          workFormat: stringOrNull(source.work_format),
          city: stringOrNull(source.city),
          postalCode: stringOrNull(source.postal_code),
          category: publicCategoryLabel({
            lang,
            categoryText: stringOrNull(source.category_text),
            category: categoryId ? categoryById.get(categoryId) ?? null : null,
          }),
          promotionStatus: "published",
          publishedAt: promotion.published_at,
          closedAt: null,
          requestStatus: stringOrNull(source.status),
        });
        if (!card) return null;
        return { ...card, summary: publicSummary(card.summary) };
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
