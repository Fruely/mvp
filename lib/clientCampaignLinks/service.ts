import type { SupabaseClient } from "@supabase/supabase-js";
import { ClientCampaignDomainError, isUniqueViolation } from "./errors";
import {
  buildCampaignSlugSeed,
  isValidCampaignSlug,
  normalizeCampaignSlug,
  withSlugSuffix,
} from "./slug";
import {
  CLIENT_CAMPAIGN_LINK_SELECT,
  type ClientCampaignLinkCreateInput,
  type ClientCampaignLinkRow,
  type ClientCampaignLinkUpdateInput,
} from "./types";

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
  const explicit = input.slug?.trim();
  if (explicit) {
    const normalized = normalizeCampaignSlug(explicit);
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
    throw new ClientCampaignDomainError("invalid_slug", 400);
  }

  if (!(await slugExists(supabase, base))) {
    return base;
  }

  for (let suffix = 2; suffix <= 99; suffix += 1) {
    const candidate = withSlugSuffix(base, suffix);
    if (!isValidCampaignSlug(candidate)) continue;
    if (!(await slugExists(supabase, candidate))) {
      return candidate;
    }
  }

  throw new ClientCampaignDomainError("slug_generation_failed", 500);
}

export async function listCampaignLinks(
  supabase: SupabaseClient,
): Promise<ClientCampaignLinkRow[]> {
  const { data, error } = await supabase
    .from("client_campaign_links")
    .select(CLIENT_CAMPAIGN_LINK_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ClientCampaignLinkRow[];
}

export async function getCampaignLinkById(
  supabase: SupabaseClient,
  id: string,
): Promise<ClientCampaignLinkRow | null> {
  const { data, error } = await supabase
    .from("client_campaign_links")
    .select(CLIENT_CAMPAIGN_LINK_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as ClientCampaignLinkRow | null) ?? null;
}

export async function createCampaignLink(
  supabase: SupabaseClient,
  input: ClientCampaignLinkCreateInput,
): Promise<ClientCampaignLinkRow> {
  const slug = await allocateUniqueCampaignSlug(supabase, input);
  const now = new Date().toISOString();

  const row = {
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
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("client_campaign_links")
    .insert(row)
    .select(CLIENT_CAMPAIGN_LINK_SELECT)
    .single();

  if (error) {
    if (isUniqueViolation(error)) {
      throw new ClientCampaignDomainError("slug_taken", 409);
    }
    throw error;
  }

  return data as ClientCampaignLinkRow;
}

export async function updateCampaignLink(
  supabase: SupabaseClient,
  id: string,
  patch: ClientCampaignLinkUpdateInput,
): Promise<ClientCampaignLinkRow> {
  const existing = await getCampaignLinkById(supabase, id);
  if (!existing) {
    throw new ClientCampaignDomainError("not_found", 404);
  }

  if (patch.slug && patch.slug !== existing.slug) {
    if (await slugExists(supabase, patch.slug)) {
      throw new ClientCampaignDomainError("slug_taken", 409);
    }
  }

  const nextTarget = {
    category_id: patch.category_id !== undefined ? patch.category_id : existing.category_id,
    category_slug: patch.category_slug !== undefined ? patch.category_slug : existing.category_slug,
    service_query: patch.service_query !== undefined ? patch.service_query : existing.service_query,
  };
  const hasTarget = Boolean(
    nextTarget.category_id || nextTarget.category_slug || nextTarget.service_query,
  );
  if (!hasTarget) {
    throw new ClientCampaignDomainError("target_required", 400);
  }

  const updateRow: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  for (const key of [
    "name",
    "ui_lang",
    "slug",
    "category_id",
    "category_slug",
    "service_query",
    "place",
    "preferred_language",
    "work_format",
    "radius_km",
    "source",
    "campaign_code",
    "is_active",
  ] as const) {
    if (patch[key] !== undefined) {
      updateRow[key] = patch[key];
    }
  }

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

  return data as ClientCampaignLinkRow;
}

export async function setCampaignLinkActive(
  supabase: SupabaseClient,
  id: string,
  isActive: boolean,
): Promise<ClientCampaignLinkRow> {
  return updateCampaignLink(supabase, id, { is_active: isActive });
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

/** All active categories for admin picker — includes zero-supply categories. */
export async function listCategoriesForCampaignAdmin(
  supabase: SupabaseClient,
): Promise<AdminCategoryOption[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, title, title_ru, title_ua, title_de, parent_id, is_active")
    .eq("is_active", true)
    .order("title", { ascending: true });

  if (error) throw error;
  return (data ?? []) as AdminCategoryOption[];
}
