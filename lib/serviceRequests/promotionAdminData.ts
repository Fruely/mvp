import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertAdminSession } from "@/lib/adminSession";
import {
  PROMOTION_ADMIN_SELECT,
  type PromotionStatus,
} from "./promotionConstants";
import { buildPublicPromotionUrl } from "./promotionUrl";
import {
  generatePromotionPublicToken,
  isUniqueViolation,
} from "./promotionToken";
import {
  validatePromotionDraftInput,
  type ValidatedPromotionDraft,
} from "./promotionValidation";

export type ServiceRequestPromotionAdmin = {
  id: string;
  service_request_id: string;
  public_token: string;
  locale: string;
  public_title: string;
  public_summary: string;
  status: PromotionStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  closed_at: string | null;
  public_url: string | null;
};

const TOKEN_INSERT_MAX_RETRIES = 5;

async function assertServiceRequestExists(serviceRequestId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_requests")
    .select("id")
    .eq("id", serviceRequestId)
    .maybeSingle();

  if (error) {
    console.error("[promotion/admin] service_request lookup failed", error);
    throw new Error("LOOKUP_FAILED");
  }

  if (!data) {
    throw new Error("NOT_FOUND");
  }
}

async function insertPromotionWithToken(
  serviceRequestId: string,
  draft: ValidatedPromotionDraft,
): Promise<ServiceRequestPromotionAdmin> {
  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  for (let attempt = 0; attempt < TOKEN_INSERT_MAX_RETRIES; attempt += 1) {
    const public_token = generatePromotionPublicToken();
    const { data, error } = await supabase
      .from("service_request_promotions")
      .insert({
        service_request_id: serviceRequestId,
        public_token,
        locale: draft.locale,
        public_title: draft.public_title,
        public_summary: draft.public_summary,
        status: "draft",
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select(PROMOTION_ADMIN_SELECT)
      .single();

    if (!error && data) {
      return mapPromotionAdminRow(data as ServiceRequestPromotionAdmin);
    }

    if (isUniqueViolation(error)) {
      const message = String((error as { message?: string }).message ?? "");
      if (message.includes("service_request_id")) {
        throw new Error("ALREADY_EXISTS");
      }
      continue;
    }

    console.error("[promotion/admin] insert failed", error);
    throw new Error("INSERT_FAILED");
  }

  throw new Error("TOKEN_GENERATION_FAILED");
}

function mapPromotionAdminRow(row: ServiceRequestPromotionAdmin): ServiceRequestPromotionAdmin {
  return {
    ...row,
    public_url:
      row.status === "published"
        ? buildPublicPromotionUrl(row.locale, row.public_token)
        : null,
  };
}

export async function getPromotionByServiceRequestIdAdmin(
  serviceRequestId: string,
): Promise<ServiceRequestPromotionAdmin | null> {
  await assertAdminSession();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_request_promotions")
    .select(PROMOTION_ADMIN_SELECT)
    .eq("service_request_id", serviceRequestId)
    .maybeSingle();

  if (error) {
    console.error("[promotion/admin] fetch failed", error);
    throw new Error("FETCH_FAILED");
  }

  if (!data) return null;
  return mapPromotionAdminRow(data as ServiceRequestPromotionAdmin);
}

export async function savePromotionDraftAdmin(
  serviceRequestId: string,
  input: unknown,
): Promise<ServiceRequestPromotionAdmin> {
  await assertAdminSession();

  const validated = validatePromotionDraftInput(
    typeof input === "object" && input != null ? (input as Record<string, unknown>) : {},
  );
  if ("error" in validated) {
    throw new Error("INVALID_INPUT");
  }

  await assertServiceRequestExists(serviceRequestId);

  const existing = await getPromotionByServiceRequestIdAdmin(serviceRequestId);
  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  if (!existing) {
    return insertPromotionWithToken(serviceRequestId, validated);
  }

  const { data, error } = await supabase
    .from("service_request_promotions")
    .update({
      locale: validated.locale,
      public_title: validated.public_title,
      public_summary: validated.public_summary,
      updated_at: nowIso,
    })
    .eq("service_request_id", serviceRequestId)
    .select(PROMOTION_ADMIN_SELECT)
    .single();

  if (error || !data) {
    console.error("[promotion/admin] update draft failed", error);
    throw new Error("UPDATE_FAILED");
  }

  return mapPromotionAdminRow(data as ServiceRequestPromotionAdmin);
}

export async function publishPromotionAdmin(
  serviceRequestId: string,
): Promise<ServiceRequestPromotionAdmin> {
  await assertAdminSession();
  await assertServiceRequestExists(serviceRequestId);

  const existing = await getPromotionByServiceRequestIdAdmin(serviceRequestId);
  if (!existing) {
    throw new Error("NOT_FOUND");
  }

  if (
    existing.status === "published" &&
    existing.published_at &&
    !existing.closed_at
  ) {
    return existing;
  }

  const draftCheck = validatePromotionDraftInput({
    locale: existing.locale,
    public_title: existing.public_title,
    public_summary: existing.public_summary,
  });
  if ("error" in draftCheck) {
    throw new Error("INVALID_INPUT");
  }

  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("service_request_promotions")
    .update({
      status: "published",
      published_at: nowIso,
      closed_at: null,
      updated_at: nowIso,
    })
    .eq("service_request_id", serviceRequestId)
    .select(PROMOTION_ADMIN_SELECT)
    .single();

  if (error || !data) {
    console.error("[promotion/admin] publish failed", error);
    throw new Error("PUBLISH_FAILED");
  }

  return mapPromotionAdminRow(data as ServiceRequestPromotionAdmin);
}

export async function closePromotionAdmin(
  serviceRequestId: string,
): Promise<ServiceRequestPromotionAdmin> {
  await assertAdminSession();
  await assertServiceRequestExists(serviceRequestId);

  const existing = await getPromotionByServiceRequestIdAdmin(serviceRequestId);
  if (!existing) {
    throw new Error("NOT_FOUND");
  }

  if (existing.status === "closed" && existing.closed_at) {
    return existing;
  }

  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("service_request_promotions")
    .update({
      status: "closed",
      closed_at: nowIso,
      updated_at: nowIso,
    })
    .eq("service_request_id", serviceRequestId)
    .select(PROMOTION_ADMIN_SELECT)
    .single();

  if (error || !data) {
    console.error("[promotion/admin] close failed", error);
    throw new Error("CLOSE_FAILED");
  }

  return mapPromotionAdminRow(data as ServiceRequestPromotionAdmin);
}
