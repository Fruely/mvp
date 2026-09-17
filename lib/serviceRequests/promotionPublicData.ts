import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PROMOTION_CAPTURE_SELECT,
  PROMOTION_CAPTURE_SELECT_WITHOUT_LOCALIZED_COPY,
} from "./promotionConstants";
import { isPublishedPromotionVisible } from "./promotionValidation";

export type PublishedPromotionPublic = {
  public_title: string;
  public_summary: string;
  locale: string;
  localized_copy?: unknown;
  published_at: string;
  status: "published";
};

export type PublishedPromotionCapture = PublishedPromotionPublic & {
  id: string;
};

function isMissingLocalizedCopyColumn(error: unknown): boolean {
  const message = String((error as { message?: string } | null)?.message ?? "");
  return message.includes("localized_copy") && /column|schema cache/i.test(message);
}

export async function getPublishedPromotionForCapture(
  publicToken: string,
): Promise<PublishedPromotionCapture | null> {
  const token = publicToken.trim();
  if (!token) return null;

  const supabase = createSupabaseServerClient();
  const first = await supabase
    .from("service_request_promotions")
    .select(PROMOTION_CAPTURE_SELECT)
    .eq("public_token", token)
    .maybeSingle();

  let data = first.data as Record<string, unknown> | null;
  let error = first.error;

  if (error && isMissingLocalizedCopyColumn(error)) {
    const fallback = await supabase
      .from("service_request_promotions")
      .select(PROMOTION_CAPTURE_SELECT_WITHOUT_LOCALIZED_COPY)
      .eq("public_token", token)
      .maybeSingle();
    data = (fallback.data as Record<string, unknown> | null) ?? null;
    error = fallback.error;
  }

  if (error) {
    console.error("[promotion/public] capture lookup failed");
    return null;
  }

  if (!data || !isPublishedPromotionVisible(data as { status: string | null; published_at: string | null; closed_at: string | null })) {
    return null;
  }

  return {
    id: data.id as string,
    public_title: data.public_title as string,
    public_summary: data.public_summary as string,
    locale: data.locale as string,
    localized_copy: data.localized_copy,
    published_at: data.published_at as string,
    status: "published",
  };
}

export async function getPublishedPromotionByToken(
  publicToken: string,
): Promise<PublishedPromotionPublic | null> {
  const capture = await getPublishedPromotionForCapture(publicToken);
  if (!capture) return null;
  const { id: _id, ...publicFields } = capture;
  return publicFields;
}
