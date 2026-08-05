import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PROMOTION_CAPTURE_SELECT, PROMOTION_PUBLIC_SELECT } from "./promotionConstants";
import { isPublishedPromotionVisible } from "./promotionValidation";

export type PublishedPromotionPublic = {
  public_title: string;
  public_summary: string;
  locale: string;
  published_at: string;
  status: "published";
};

export type PublishedPromotionCapture = PublishedPromotionPublic & {
  id: string;
};

export async function getPublishedPromotionForCapture(
  publicToken: string,
): Promise<PublishedPromotionCapture | null> {
  const token = publicToken.trim();
  if (!token) return null;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_request_promotions")
    .select(PROMOTION_CAPTURE_SELECT)
    .eq("public_token", token)
    .maybeSingle();

  if (error) {
    console.error("[promotion/public] capture lookup failed");
    return null;
  }

  if (!data || !isPublishedPromotionVisible(data)) {
    return null;
  }

  return {
    id: data.id as string,
    public_title: data.public_title,
    public_summary: data.public_summary,
    locale: data.locale,
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
