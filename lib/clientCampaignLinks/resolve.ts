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
  });
}

export function buildCampaignPublicUrl(siteOrigin: string, slug: string): string {
  return campaignPublicUrl(slug, siteOrigin);
}

export function summarizeCampaignContext(
  campaign: Pick<
    ClientCampaignLinkRow,
    | "name"
    | "category_slug"
    | "service_query"
    | "place"
    | "preferred_language"
    | "work_format"
    | "source"
  >,
): string {
  const parts: string[] = [];
  if (campaign.category_slug) parts.push(campaign.category_slug);
  else if (campaign.service_query) parts.push(campaign.service_query);
  if (campaign.place) parts.push(campaign.place);
  if (campaign.preferred_language) parts.push(campaign.preferred_language);
  if (campaign.work_format) parts.push(campaign.work_format);
  if (campaign.source) parts.push(campaign.source);
  return parts.join(" · ") || campaign.name;
}
