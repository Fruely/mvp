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

function hasTarget(input: {
  category_id?: string | null;
  category_slug?: string | null;
  service_query?: string | null;
}): boolean {
  return Boolean(
    input.category_id?.trim() ||
      input.category_slug?.trim() ||
      input.service_query?.trim(),
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
  if (!name) return { error: "name_required", status: 400 };

  const uiLangRaw = str(raw.ui_lang);
  if (!uiLangRaw || !isClientCampaignUiLang(uiLangRaw)) {
    return { error: "invalid_ui_lang", status: 400 };
  }

  const category_id = str(raw.category_id);
  const category_slug = str(raw.category_slug);
  const service_query = str(raw.service_query);

  if (!hasTarget({ category_id, category_slug, service_query })) {
    return { error: "category_or_service_query_required", status: 400 };
  }

  let slug: string | null = null;
  if (raw.slug != null && String(raw.slug).trim()) {
    slug = normalizeCampaignSlug(String(raw.slug));
    if (!isValidCampaignSlug(slug)) return { error: "invalid_slug", status: 400 };
  }

  const preferred_language = str(raw.preferred_language);
  if (
    preferred_language &&
    !["ru", "ua", "de", "uk"].includes(preferred_language.toLowerCase())
  ) {
    return { error: "invalid_preferred_language", status: 400 };
  }

  const work_formatRaw = str(raw.work_format);
  if (work_formatRaw && !isClientCampaignWorkFormat(work_formatRaw)) {
    return { error: "invalid_work_format", status: 400 };
  }

  const sourceRaw = str(raw.source);
  if (sourceRaw && !isClientCampaignSource(sourceRaw)) {
    return { error: "invalid_source", status: 400 };
  }

  const radius_km = parseRadius(raw.radius_km);
  if (raw.radius_km != null && raw.radius_km !== "" && radius_km == null) {
    return { error: "invalid_radius_km", status: 400 };
  }

  return {
    name,
    ui_lang: uiLangRaw,
    slug,
    category_id,
    category_slug,
    service_query,
    place: str(raw.place),
    preferred_language: preferred_language?.toLowerCase() ?? null,
    work_format: work_formatRaw ? (work_formatRaw as ClientCampaignLinkCreateInput["work_format"]) : null,
    radius_km,
    source: sourceRaw ? (sourceRaw as ClientCampaignLinkCreateInput["source"]) : null,
    campaign_code: str(raw.campaign_code),
    is_active: typeof raw.is_active === "boolean" ? raw.is_active : true,
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
    if (!name) return { error: "name_required", status: 400 };
    patch.name = name;
  }

  if (raw.ui_lang !== undefined) {
    const uiLang = str(raw.ui_lang);
    if (!uiLang || !isClientCampaignUiLang(uiLang)) {
      return { error: "invalid_ui_lang", status: 400 };
    }
    patch.ui_lang = uiLang;
  }

  if (raw.slug !== undefined) {
    const slug = normalizeCampaignSlug(String(raw.slug ?? ""));
    if (!isValidCampaignSlug(slug)) return { error: "invalid_slug", status: 400 };
    patch.slug = slug;
  }

  if (raw.category_id !== undefined) patch.category_id = str(raw.category_id);
  if (raw.category_slug !== undefined) patch.category_slug = str(raw.category_slug);
  if (raw.service_query !== undefined) patch.service_query = str(raw.service_query);
  if (raw.place !== undefined) patch.place = str(raw.place);
  if (raw.campaign_code !== undefined) patch.campaign_code = str(raw.campaign_code);

  if (raw.preferred_language !== undefined) {
    const preferred = str(raw.preferred_language);
    if (preferred && !["ru", "ua", "de", "uk"].includes(preferred.toLowerCase())) {
      return { error: "invalid_preferred_language", status: 400 };
    }
    patch.preferred_language = preferred?.toLowerCase() ?? null;
  }

  if (raw.work_format !== undefined) {
    const wf = str(raw.work_format);
    if (wf && !isClientCampaignWorkFormat(wf)) {
      return { error: "invalid_work_format", status: 400 };
    }
    patch.work_format = wf ? (wf as ClientCampaignLinkUpdateInput["work_format"]) : null;
  }

  if (raw.source !== undefined) {
    const source = str(raw.source);
    if (source && !isClientCampaignSource(source)) {
      return { error: "invalid_source", status: 400 };
    }
    patch.source = source ? (source as ClientCampaignLinkUpdateInput["source"]) : null;
  }

  if (raw.radius_km !== undefined) {
    const radius = parseRadius(raw.radius_km);
    if (raw.radius_km != null && raw.radius_km !== "" && radius == null) {
      return { error: "invalid_radius_km", status: 400 };
    }
    patch.radius_km = radius;
  }

  if (typeof raw.is_active === "boolean") patch.is_active = raw.is_active;

  return patch;
}

export function isAllowedCampaignSource(value: string): boolean {
  return (CLIENT_CAMPAIGN_SOURCES as readonly string[]).includes(value);
}

export function isAllowedCampaignUiLang(value: string): boolean {
  return (CLIENT_CAMPAIGN_UI_LANGS as readonly string[]).includes(value);
}

export function isAllowedCampaignWorkFormat(value: string): boolean {
  return (CLIENT_CAMPAIGN_WORK_FORMATS as readonly string[]).includes(value);
}
