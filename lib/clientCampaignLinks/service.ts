import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG } from "@/lib/categories/uncategorizedSpecialistCategory";
import { ClientCampaignDomainError, isUniqueViolation } from "./errors";
import {
  buildCampaignSlugSeed,
  isValidCampaignSlug,
  normalizeCampaignSlug,
  withSlugSuffix,
} from "./slug";
import type {
  ClientCampaignLinkCreateInput,
  ClientCampaignLinkRow,
  ClientCampaignLinkUpdateInput,
} from "./types";
import { CLIENT_CAMPAIGN_LINK_SELECT } from "./types";

export { ClientCampaignDomainError } from "./errors";

async function slugExists(supabase: SupabaseClient, slug: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("client_campaign_links")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function allocateUniqueCampaignSlug(
  supabase: SupabaseClient,
  input: ClientCampaignLinkCreateInput,
): Promise<string> {
  if (input.slug?.trim()) {
    const normalized = normalizeCampaignSlug(input.slug);
    if (!isValidCampaignSlug(normalized)) {
      throw new ClientCampaignDomainError("invalid_slug", 400);
    }
    if (await slugExists(supabase, normalized)) {
      throw new ClientCampaignDomainError("slug_taken", 409);
    }
    return normalized;
  }

  const base = buildCampaignSlugSeed({
    name: input.name,
    ui_lang: input.ui_lang,
    category_slug: input.category_slug,
    place: input.place,
    service_query: input.service_query,
  });

  if (!isValidCampaignSlug(base)) {
    throw new ClientCampaignDomainError("invalid_slug_seed", 400);
  }

  if (!(await slugExists(supabase, base))) return base;

  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const candidate = withSlugSuffix(base, suffix);
    if (isValidCampaignSlug(candidate) && !(await slugExists(supabase, candidate))) {
      return candidate;
    }
  }

  throw new ClientCampaignDomainError("slug_exhausted", 409);
}

function rowToCampaign(data: Record<string, unknown>): ClientCampaignLinkRow {
  return data as ClientCampaignLinkRow;
}

export async function listClientCampaignLinks(
  supabase: SupabaseClient,
): Promise<ClientCampaignLinkRow[]> {
  const { data, error } = await supabase
    .from("client_campaign_links")
    .select(CLIENT_CAMPAIGN_LINK_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => rowToCampaign(row as Record<string, unknown>));
}

export async function getClientCampaignLinkById(
  supabase: SupabaseClient,
  id: string,
): Promise<ClientCampaignLinkRow | null> {
  const { data, error } = await supabase
    .from("client_campaign_links")
    .select(CLIENT_CAMPAIGN_LINK_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToCampaign(data as Record<string, unknown>) : null;
}

export async function findActiveCampaignBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<ClientCampaignLinkRow | null> {
  const normalized = normalizeCampaignSlug(slug);
  if (!normalized || !isValidCampaignSlug(normalized)) return null;

  const { data, error } = await supabase
    .from("client_campaign_links")
    .select(CLIENT_CAMPAIGN_LINK_SELECT)
    .eq("slug", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data ? rowToCampaign(data as Record<string, unknown>) : null;
}

export async function findCampaignByIdForAttribution(
  supabase: SupabaseClient,
  id: string,
): Promise<ClientCampaignLinkRow | null> {
  const { data, error } = await supabase
    .from("client_campaign_links")
    .select(CLIENT_CAMPAIGN_LINK_SELECT)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToCampaign(data as Record<string, unknown>) : null;
}

export async function createClientCampaignLink(
  supabase: SupabaseClient,
  input: ClientCampaignLinkCreateInput,
): Promise<ClientCampaignLinkRow> {
  const slug = await allocateUniqueCampaignSlug(supabase, input);
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("client_campaign_links")
    .insert({
      slug,
      name: input.name.trim(),
      ui_lang: input.ui_lang,
      category_id: input.category_id ?? null,
      category_slug: input.category_slug ?? null,
      service_query: input.service_query ?? null,
      place: input.place ?? null,
      preferred_language: input.preferred_language ?? null,
      work_format: input.work_format ?? null,
      radius_km: input.radius_km ?? null,
      source: input.source ?? null,
      campaign_code: input.campaign_code ?? null,
      is_active: input.is_active ?? true,
      updated_at: nowIso,
    })
    .select(CLIENT_CAMPAIGN_LINK_SELECT)
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new ClientCampaignDomainError("slug_taken", 409);
    }
    throw error;
  }
  return rowToCampaign(data as Record<string, unknown>);
}

export async function updateClientCampaignLink(
  supabase: SupabaseClient,
  id: string,
  patch: ClientCampaignLinkUpdateInput,
): Promise<ClientCampaignLinkRow> {
  const existing = await getClientCampaignLinkById(supabase, id);
  if (!existing) throw new ClientCampaignDomainError("not_found", 404);

  const nextSlug = patch.slug?.trim();
  if (nextSlug && nextSlug !== existing.slug) {
    const normalized = normalizeCampaignSlug(nextSlug);
    if (!isValidCampaignSlug(normalized)) {
      throw new ClientCampaignDomainError("invalid_slug", 400);
    }
    if (await slugExists(supabase, normalized)) {
      throw new ClientCampaignDomainError("slug_taken", 409);
    }
  }

  const mergedTarget = {
    category_id: patch.category_id !== undefined ? patch.category_id : existing.category_id,
    category_slug: patch.category_slug !== undefined ? patch.category_slug : existing.category_slug,
    service_query: patch.service_query !== undefined ? patch.service_query : existing.service_query,
  };
  if (
    !mergedTarget.category_id?.trim() &&
    !mergedTarget.category_slug?.trim() &&
    !mergedTarget.service_query?.trim()
  ) {
    throw new ClientCampaignDomainError("category_or_service_query_required", 400);
  }

  const updateRow: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) updateRow.name = patch.name;
  if (patch.ui_lang !== undefined) updateRow.ui_lang = patch.ui_lang;
  if (patch.slug !== undefined) updateRow.slug = normalizeCampaignSlug(patch.slug);
  if (patch.category_id !== undefined) updateRow.category_id = patch.category_id;
  if (patch.category_slug !== undefined) updateRow.category_slug = patch.category_slug;
  if (patch.service_query !== undefined) updateRow.service_query = patch.service_query;
  if (patch.place !== undefined) updateRow.place = patch.place;
  if (patch.preferred_language !== undefined) updateRow.preferred_language = patch.preferred_language;
  if (patch.work_format !== undefined) updateRow.work_format = patch.work_format;
  if (patch.radius_km !== undefined) updateRow.radius_km = patch.radius_km;
  if (patch.source !== undefined) updateRow.source = patch.source;
  if (patch.campaign_code !== undefined) updateRow.campaign_code = patch.campaign_code;
  if (patch.is_active !== undefined) updateRow.is_active = patch.is_active;

  const { data, error } = await supabase
    .from("client_campaign_links")
    .update(updateRow)
    .eq("id", id)
    .select(CLIENT_CAMPAIGN_LINK_SELECT)
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new ClientCampaignDomainError("slug_taken", 409);
    }
    throw error;
  }
  return rowToCampaign(data as Record<string, unknown>);
}

export async function setClientCampaignLinkActive(
  supabase: SupabaseClient,
  id: string,
  isActive: boolean,
): Promise<ClientCampaignLinkRow> {
  return updateClientCampaignLink(supabase, id, { is_active: isActive });
}

export type AdminCategoryOption = {
  id: string;
  slug: string;
  title: string;
  title_ru: string | null;
  title_ua: string | null;
  title_de: string | null;
  parent_id: string | null;
  is_active: boolean;
};

export async function listCategoriesForCampaignAdmin(
  supabase: SupabaseClient,
): Promise<AdminCategoryOption[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, title, title_ru, title_ua, title_de, parent_id, is_active")
    .eq("is_active", true)
    .order("title", { ascending: true });

  if (error) throw error;
  return (data ?? []).filter((c) => c.slug !== UNCATEGORIZED_SPECIALIST_CATEGORY_SLUG) as AdminCategoryOption[];
}
