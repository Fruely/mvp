import type { SupabaseClient } from "@supabase/supabase-js";
import { requestServiceHref } from "@/lib/serviceRequests/requestServiceHref";
import { campaignPreferredLanguageToFormLang } from "./constants";
import { campaignPublicPath } from "./publicUrl";
import type { ClientCampaignLinkRow } from "./types";

export function campaignLinkToRequestHref(link: ClientCampaignLinkRow): string {
  const lang = link.ui_lang;
  const preferred = campaignPreferredLanguageToFormLang(link.preferred_language);

  return requestServiceHref(lang, {
    category_id: link.category_id,
    category_text: link.category_slug,
    q: link.service_query,
    place: link.place,
    preferred_language: preferred ?? undefined,
    work_format: link.work_format ?? undefined,
    radius_km: link.radius_km ?? undefined,
    source_path: campaignPublicPath(link.slug),
    client_campaign_link_id: link.id,
  });
}

export type ResolvedCampaignLink = ClientCampaignLinkRow & {
  category_title?: string | null;
};

export async function findActiveCampaignBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<ResolvedCampaignLink | null> {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("client_campaign_links")
    .select("*")
    .eq("slug", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) return null;
  return data as ResolvedCampaignLink;
}

export async function findCampaignLinkByIdForAttribution(
  supabase: SupabaseClient,
  id: string,
): Promise<ClientCampaignLinkRow | null> {
  const { data, error } = await supabase
    .from("client_campaign_links")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return data as ClientCampaignLinkRow;
}
