import {
  CLIENT_CAMPAIGN_SOURCES,
  CLIENT_CAMPAIGN_UI_LANGS,
  CLIENT_CAMPAIGN_WORK_FORMATS,
  isClientCampaignSource,
  isClientCampaignUiLang,
  isClientCampaignWorkFormat,
} from "./constants";
import { isValidCampaignSlug, normalizeCampaignSlug } from "./slug";
import type { ClientCampaignLinkCreateInput, ClientCampaignLinkUpdateInput } from "./types";

export type CampaignValidationError = { error: string; status: number };

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseRadius(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function validatePreferredLanguage(value: unknown): string | null | CampaignValidationError {
  const raw = str(value);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (!["ru", "ua", "de", "uk"].includes(lower)) {
    return { error: "invalid preferred_language", status: 400 };
  }
  return lower;
}

function hasTarget(input: {
  category_id?: string | null;
  category_slug?: string | null;
  service_query?: string | null;
}): boolean {
  return Boolean(
    str(input.category_id) ||
      str(input.category_slug) ||
      str(input.service_query),
  );
}

export function validateCampaignLinkCreate(
  body: unknown,
): ClientCampaignLinkCreateInput | CampaignValidationError {
  if (!body || typeof body !== "object") {
    return { error: "invalid_json", status: 400 };
  }
  const raw = body as Record<string, unknown>;

  const name = str(raw.name);
  if (!name) {
    return { error: "name is required", status: 400 };
  }

  const uiLangRaw = str(raw.ui_lang);
  if (!uiLangRaw || !isClientCampaignUiLang(uiLangRaw)) {
    return { error: "invalid ui_lang", status: 400 };
  }

  const category_id = str(raw.category_id);
  const category_slug = str(raw.category_slug);
  const service_query = str(raw.service_query);

  if (!hasTarget({ category_id, category_slug, service_query })) {
    return { error: "category or service_query is required", status: 400 };
  }

  const preferred = validatePreferredLanguage(raw.preferred_language);
  if (preferred && "error" in preferred) return preferred;

  const workFormatRaw = str(raw.work_format);
  if (workFormatRaw && !isClientCampaignWorkFormat(workFormatRaw)) {
    return { error: "invalid work_format", status: 400 };
  }

  const sourceRaw = str(raw.source);
  if (sourceRaw && !isClientCampaignSource(sourceRaw)) {
    return { error: "invalid source", status: 400 };
  }

  const radius_km = parseRadius(raw.radius_km);
  if (raw.radius_km != null && raw.radius_km !== "" && radius_km == null) {
    return { error: "invalid radius_km", status: 400 };
  }

  let slug: string | null = null;
  if (raw.slug != null && String(raw.slug).trim()) {
    slug = normalizeCampaignSlug(String(raw.slug));
    if (!isValidCampaignSlug(slug)) {
      return { error: "invalid slug", status: 400 };
    }
  }

  const is_active =
    typeof raw.is_active === "boolean" ? raw.is_active : true;

  return {
    name,
    ui_lang: uiLangRaw,
    slug,
    category_id,
    category_slug,
    service_query,
    place: str(raw.place),
    preferred_language: preferred,
    work_format: workFormatRaw as ClientCampaignLinkCreateInput["work_format"],
    radius_km,
    source: sourceRaw as ClientCampaignLinkCreateInput["source"],
    campaign_code: str(raw.campaign_code),
    is_active,
  };
}

export function validateCampaignLinkUpdate(
  body: unknown,
): ClientCampaignLinkUpdateInput | CampaignValidationError {
  if (!body || typeof body !== "object") {
    return { error: "invalid_json", status: 400 };
  }
  const raw = body as Record<string, unknown>;
  const patch: ClientCampaignLinkUpdateInput = {};

  if (raw.name !== undefined) {
    const name = str(raw.name);
    if (!name) return { error: "name cannot be empty", status: 400 };
    patch.name = name;
  }

  if (raw.ui_lang !== undefined) {
    const uiLang = str(raw.ui_lang);
    if (!uiLang || !isClientCampaignUiLang(uiLang)) {
      return { error: "invalid ui_lang", status: 400 };
    }
    patch.ui_lang = uiLang;
  }

  if (raw.slug !== undefined) {
    const slug = normalizeCampaignSlug(String(raw.slug));
    if (!isValidCampaignSlug(slug)) {
      return { error: "invalid slug", status: 400 };
    }
    patch.slug = slug;
  }

  if (raw.category_id !== undefined) patch.category_id = str(raw.category_id);
  if (raw.category_slug !== undefined) patch.category_slug = str(raw.category_slug);
  if (raw.service_query !== undefined) patch.service_query = str(raw.service_query);
  if (raw.place !== undefined) patch.place = str(raw.place);
  if (raw.campaign_code !== undefined) patch.campaign_code = str(raw.campaign_code);

  if (raw.preferred_language !== undefined) {
    const preferred = validatePreferredLanguage(raw.preferred_language);
    if (preferred && "error" in preferred) return preferred;
    patch.preferred_language = preferred;
  }

  if (raw.work_format !== undefined) {
    const wf = str(raw.work_format);
    if (wf && !isClientCampaignWorkFormat(wf)) {
      return { error: "invalid work_format", status: 400 };
    }
    patch.work_format = wf as ClientCampaignLinkUpdateInput["work_format"];
  }

  if (raw.source !== undefined) {
    const source = str(raw.source);
    if (source && !isClientCampaignSource(source)) {
      return { error: "invalid source", status: 400 };
    }
    patch.source = source as ClientCampaignLinkUpdateInput["source"];
  }

  if (raw.radius_km !== undefined) {
    const radius_km = parseRadius(raw.radius_km);
    if (raw.radius_km != null && raw.radius_km !== "" && radius_km == null) {
      return { error: "invalid radius_km", status: 400 };
    }
    patch.radius_km = radius_km;
  }

  if (typeof raw.is_active === "boolean") {
    patch.is_active = raw.is_active;
  }

  return patch;
}

export function summarizeCampaignContext(link: {
  ui_lang: string;
  category_slug?: string | null;
  service_query?: string | null;
  place?: string | null;
  preferred_language?: string | null;
  work_format?: string | null;
  source?: string | null;
}): string {
  const parts: string[] = [link.ui_lang.toUpperCase()];
  if (link.category_slug) parts.push(link.category_slug);
  else if (link.service_query) parts.push(`q:${link.service_query}`);
  if (link.place) parts.push(link.place);
  if (link.preferred_language) parts.push(`lang:${link.preferred_language}`);
  if (link.work_format) parts.push(link.work_format);
  if (link.source) parts.push(link.source);
  return parts.join(" · ");
}

export const CLIENT_CAMPAIGN_SOURCE_OPTIONS = [...CLIENT_CAMPAIGN_SOURCES];
export const CLIENT_CAMPAIGN_UI_LANG_OPTIONS = [...CLIENT_CAMPAIGN_UI_LANGS];
export const CLIENT_CAMPAIGN_WORK_FORMAT_OPTIONS = [...CLIENT_CAMPAIGN_WORK_FORMATS];
