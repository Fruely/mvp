import type { Lang } from "@/lib/i18n";
import { requestServiceHref } from "@/lib/serviceRequests/requestServiceHref";
import {
  CLIENT_CAMPAIGN_PUBLIC_PATH_PREFIX,
  campaignPreferredLanguageToFormLang,
} from "./constants";
import type { ClientCampaignLinkRow } from "./types";

export function buildCampaignSourcePath(slug: string): string {
  return `${CLIENT_CAMPAIGN_PUBLIC_PATH_PREFIX}/${slug.trim()}`;
}

export function buildCampaignPublicUrl(siteOrigin: string, slug: string): string {
  const base = siteOrigin.replace(/\/+$/, "");
  return `${base}${buildCampaignSourcePath(slug)}`;
}

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
    source_path: buildCampaignSourcePath(campaign.slug),
    q: campaign.service_query,
    place: campaign.place,
    preferred_language: preferred,
    work_format: campaign.work_format,
    radius_km: campaign.radius_km,
  });
}

export function summarizeCampaignContext(campaign: ClientCampaignLinkRow): string {
  const parts: string[] = [];
  if (campaign.category_slug) parts.push(campaign.category_slug);
  else if (campaign.service_query) parts.push(campaign.service_query);
  if (campaign.place) parts.push(campaign.place);
  if (campaign.preferred_language) parts.push(campaign.preferred_language);
  if (campaign.work_format) parts.push(campaign.work_format);
  if (campaign.source) parts.push(campaign.source);
  return parts.join(" · ") || campaign.name;
}
