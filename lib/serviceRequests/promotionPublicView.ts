import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatServiceTimingDisplay } from "@/lib/serviceRequests/serviceTiming";
import { getPublishedPromotionForCapture } from "./promotionPublicData";

/** Safe service_request fields for public promoted preview — no PII. */
export const PROMOTION_SAFE_REQUEST_SELECT =
  "work_format, preferred_language, city, postal_code, service_timing_type, service_timing_date, service_timing_time, service_timing_date_end, service_timing_period, service_timing_note, urgency, desired_date";

export type PublishedPromotionPublicView = {
  id: string;
  public_title: string;
  public_summary: string;
  locale: string;
  published_at: string;
  status: "published";
  public_token: string;
  when_label: string | null;
  work_format: string | null;
  preferred_language: string | null;
  location_label: string | null;
};

function buildLocationLabel(city: string | null, postal_code: string | null): string | null {
  const parts = [postal_code?.trim(), city?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

export async function getPublishedPromotionPublicView(
  publicToken: string,
): Promise<PublishedPromotionPublicView | null> {
  const promotion = await getPublishedPromotionForCapture(publicToken);
  if (!promotion) return null;

  const supabase = createSupabaseServerClient();
  const { data: promoRow } = await supabase
    .from("service_request_promotions")
    .select("service_request_id, public_token")
    .eq("id", promotion.id)
    .maybeSingle();

  if (!promoRow?.service_request_id) {
    return {
      ...promotion,
      public_token: publicToken.trim(),
      when_label: null,
      work_format: null,
      preferred_language: null,
      location_label: null,
    };
  }

  const { data: requestRow } = await supabase
    .from("service_requests")
    .select(PROMOTION_SAFE_REQUEST_SELECT)
    .eq("id", promoRow.service_request_id)
    .maybeSingle();

  const locale =
    promotion.locale === "de" || promotion.locale === "ua" || promotion.locale === "ru"
      ? promotion.locale
      : "ru";

  return {
    ...promotion,
    public_token: (promoRow.public_token as string) ?? publicToken.trim(),
    when_label: requestRow
      ? formatServiceTimingDisplay(requestRow, locale)
      : null,
    work_format: (requestRow?.work_format as string | null) ?? null,
    preferred_language: (requestRow?.preferred_language as string | null) ?? null,
    location_label: requestRow
      ? buildLocationLabel(
          (requestRow.city as string | null) ?? null,
          (requestRow.postal_code as string | null) ?? null,
        )
      : null,
  };
}

export function buildPromotedAcceptUrl(lang: string, publicToken: string): string {
  return `/${lang}/request/${encodeURIComponent(publicToken.trim())}/accept`;
}

export function buildPromotedPublicUrl(lang: string, publicToken: string): string {
  return `/${lang}/request/${encodeURIComponent(publicToken.trim())}`;
}
