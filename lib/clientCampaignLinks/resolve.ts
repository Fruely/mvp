import type { Lang } from "@/lib/i18n";
import { requestServiceHref } from "@/lib/serviceRequests/requestServiceHref";
import { campaignPreferredLanguageToFormLang } from "./constants";
import { campaignPublicPath, campaignPublicUrl } from "./publicUrl";
import type { ClientCampaignLinkRow } from "./types";

export { campaignPublicPath, campaignPublicUrl };

export function campaignLinkToRequestHref(
  campaign: ClientCampaignLinkRow,
  opts?: { category_text?: string | null },
): string {
  const preferred = campaignPreferredLanguageToFormLang(campaign.preferred_language);
  const categoryText =
    opts?.category_text?.trim() ||
    campaign.service_query?.trim() ||
    null;

  return requestServiceHref(campaign.ui_lang as Lang, {
    category_id: campaign.category_id,
    category_text: categoryText,
    source_path: campaignPublicPath(campaign.slug),
    q: campaign.service_query,
    place: campaign.place,
    preferred_language: preferred,
    work_format: campaign.work_format,
    radius_km: campaign.radius_km,
    client_campaign_link_id: campaign.id,
  });
}

export function buildCampaignPublicUrl(siteOrigin: string, slug: string): string {
  return campaignPublicUrl(slug, siteOrigin);
}
