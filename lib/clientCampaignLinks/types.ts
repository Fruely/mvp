import type {
  ClientCampaignSource,
  ClientCampaignUiLang,
  ClientCampaignWorkFormat,
} from "./constants";

export type ClientCampaignLinkRow = {
  id: string;
  slug: string;
  name: string;
  ui_lang: ClientCampaignUiLang;
  category_id: string | null;
  category_slug: string | null;
  service_query: string | null;
  place: string | null;
  preferred_language: string | null;
  work_format: ClientCampaignWorkFormat | null;
  radius_km: number | null;
  source: ClientCampaignSource | null;
  campaign_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ClientCampaignLinkCreateInput = {
  name: string;
  ui_lang: ClientCampaignUiLang;
  slug?: string | null;
  category_id?: string | null;
  category_slug?: string | null;
  service_query?: string | null;
  place?: string | null;
  preferred_language?: string | null;
  work_format?: ClientCampaignWorkFormat | null;
  radius_km?: number | null;
  source?: ClientCampaignSource | null;
  campaign_code?: string | null;
  is_active?: boolean;
};

export type ClientCampaignLinkUpdateInput = Partial<
  Omit<ClientCampaignLinkCreateInput, "slug">
> & {
  slug?: string;
};

export const CLIENT_CAMPAIGN_LINK_SELECT =
  "id, slug, name, ui_lang, category_id, category_slug, service_query, place, preferred_language, work_format, radius_km, source, campaign_code, is_active, created_at, updated_at";
