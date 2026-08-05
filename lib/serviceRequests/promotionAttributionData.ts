import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ATTRIBUTION_ROW_SELECT, type SanitizedUtmFields } from "./attributionConstants";
import {
  generateAttributionToken,
  isUniqueViolation,
} from "./attributionToken";

export type PromotionAttributionRow = {
  id: string;
  promotion_id: string;
  attribution_token: string;
  landing_locale: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  referrer_host: string | null;
  first_seen_at: string;
  last_seen_at: string;
  visit_count: number;
};

const TOKEN_INSERT_MAX_RETRIES = 5;

export async function getAttributionByToken(
  attributionToken: string,
): Promise<PromotionAttributionRow | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_request_promotion_attributions")
    .select(ATTRIBUTION_ROW_SELECT)
    .eq("attribution_token", attributionToken)
    .maybeSingle();

  if (error) {
    console.error("[attribution/data] lookup failed");
    throw new Error("LOOKUP_FAILED");
  }

  return (data as PromotionAttributionRow | null) ?? null;
}

export async function insertAttributionRow(input: {
  promotionId: string;
  landingLocale: string;
  utm: SanitizedUtmFields;
  referrerHost: string | null;
}): Promise<PromotionAttributionRow> {
  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  for (let attempt = 0; attempt < TOKEN_INSERT_MAX_RETRIES; attempt += 1) {
    const attribution_token = generateAttributionToken();
    const { data, error } = await supabase
      .from("service_request_promotion_attributions")
      .insert({
        promotion_id: input.promotionId,
        attribution_token,
        landing_locale: input.landingLocale,
        utm_source: input.utm.utm_source,
        utm_medium: input.utm.utm_medium,
        utm_campaign: input.utm.utm_campaign,
        utm_content: input.utm.utm_content,
        referrer_host: input.referrerHost,
        first_seen_at: nowIso,
        last_seen_at: nowIso,
        visit_count: 1,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select(ATTRIBUTION_ROW_SELECT)
      .single();

    if (!error && data) {
      return data as PromotionAttributionRow;
    }

    if (isUniqueViolation(error)) {
      continue;
    }

    console.error("[attribution/data] insert failed");
    throw new Error("INSERT_FAILED");
  }

  throw new Error("TOKEN_GENERATION_FAILED");
}

export async function recordAttributionRepeatVisit(
  attributionToken: string,
): Promise<void> {
  const existing = await getAttributionByToken(attributionToken);
  if (!existing) {
    throw new Error("NOT_FOUND");
  }

  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("service_request_promotion_attributions")
    .update({
      last_seen_at: nowIso,
      updated_at: nowIso,
      visit_count: existing.visit_count + 1,
    })
    .eq("attribution_token", attributionToken);

  if (error) {
    console.error("[attribution/data] repeat visit update failed");
    throw new Error("UPDATE_FAILED");
  }
}
