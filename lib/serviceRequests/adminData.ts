import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { assertAdminSession } from "@/lib/adminSession";
import {
  SERVICE_REQUEST_ADMIN_DETAIL_SELECT,
  SERVICE_REQUEST_LIST_SELECT,
  isAllowedAdminStatus,
} from "@/lib/serviceRequests/validation";

const ACQUISITION_DETAIL_SELECT =
  "acquisition_source, acquisition_medium, acquisition_campaign, acquisition_content, acquisition_term, acquisition_gclid, acquisition_fbclid, acquisition_referrer, acquisition_landing_path, acquisition_captured_at";

const DEMAND_DETAIL_SELECT = [
  "subcategory_text",
  "requested_service",
  "client_budget_text",
  "preferred_contact_method",
  "existing_supply_count",
  "profiles_shown_count",
  "external_search_required",
  "fulfillment_status",
  "matched_specialist_name",
  "matched_specialist_id",
  "first_response_at",
  "matched_at",
  "closed_at",
  "loss_reason",
  "fulfillment_notes",
  "external_specialist_name",
  "external_specialist_source",
  "external_specialist_contact",
  "specialist_acquisition_status",
  "specialist_acquisition_plan",
  "specialist_registered_at",
  "specialist_became_paid_at",
  "specialist_acquisition_notes",
  "attributed_ad_cost_cents",
  "attributed_revenue_cents",
].join(", ");

export const FULFILLMENT_STATUSES = [
  "unassessed",
  "existing_supply",
  "external_search",
  "specialist_found",
  "matched",
  "fulfilled",
  "unfilled",
] as const;

export const SPECIALIST_ACQUISITION_STATUSES = [
  "not_started",
  "prospecting",
  "contacted",
  "invited",
  "registered",
  "paid",
  "declined",
  "not_needed",
] as const;

export type ServiceRequestListItem = {
  id: string;
  public_id: string;
  created_at: string | null;
  category_text: string | null;
  preferred_language: string | null;
  work_format: string | null;
  city: string | null;
  postal_code: string | null;
  urgency: string | null;
  desired_date?: string | null;
  service_timing_type?: string | null;
  service_timing_date?: string | null;
  service_timing_time?: string | null;
  service_timing_date_end?: string | null;
  service_timing_period?: string | null;
  service_timing_note?: string | null;
  status: string | null;
};

export type ServiceRequestCampaignAttribution = {
  id: string;
  slug: string;
  name: string;
  source: string | null;
  campaign_code: string | null;
};

export type ServiceRequestDetail = ServiceRequestListItem & {
  description: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  desired_date: string | null;
  locale: string | null;
  source: string | null;
  source_path: string | null;
  client_campaign_link_id: string | null;
  acquisition_source: string | null;
  acquisition_medium: string | null;
  acquisition_campaign: string | null;
  acquisition_content: string | null;
  acquisition_term: string | null;
  acquisition_gclid: string | null;
  acquisition_fbclid: string | null;
  acquisition_referrer: string | null;
  acquisition_landing_path: string | null;
  acquisition_captured_at: string | null;
  subcategory_text: string | null;
  requested_service: string | null;
  client_budget_text: string | null;
  preferred_contact_method: string | null;
  existing_supply_count: number | null;
  profiles_shown_count: number | null;
  external_search_required: boolean;
  fulfillment_status: string;
  matched_specialist_name: string | null;
  matched_specialist_id: string | null;
  first_response_at: string | null;
  matched_at: string | null;
  closed_at: string | null;
  loss_reason: string | null;
  fulfillment_notes: string | null;
  external_specialist_name: string | null;
  external_specialist_source: string | null;
  external_specialist_contact: string | null;
  specialist_acquisition_status: string;
  specialist_acquisition_plan: string | null;
  specialist_registered_at: string | null;
  specialist_became_paid_at: string | null;
  specialist_acquisition_notes: string | null;
  attributed_ad_cost_cents: number | null;
  attributed_revenue_cents: number | null;
  campaign_attribution: ServiceRequestCampaignAttribution | null;
};

export type ServiceRequestDemandAdminInput = {
  subcategory_text?: unknown;
  requested_service?: unknown;
  client_budget_text?: unknown;
  preferred_contact_method?: unknown;
  existing_supply_count?: unknown;
  profiles_shown_count?: unknown;
  external_search_required?: unknown;
  fulfillment_status?: unknown;
  matched_specialist_name?: unknown;
  matched_specialist_id?: unknown;
  first_response_at?: unknown;
  matched_at?: unknown;
  closed_at?: unknown;
  loss_reason?: unknown;
  fulfillment_notes?: unknown;
  external_specialist_name?: unknown;
  external_specialist_source?: unknown;
  external_specialist_contact?: unknown;
  specialist_acquisition_status?: unknown;
  specialist_acquisition_plan?: unknown;
  specialist_registered_at?: unknown;
  specialist_became_paid_at?: unknown;
  specialist_acquisition_notes?: unknown;
  attributed_ad_cost_cents?: unknown;
  attributed_revenue_cents?: unknown;
};

function nullableText(value: unknown, max = 2000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function nullableNonNegativeInteger(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

function nullableIso(value: unknown): string | null {
  const text = nullableText(value, 80);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function allowed<T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] {
  return typeof value === "string" && (values as readonly string[]).includes(value)
    ? (value as T[number])
    : fallback;
}

export async function listServiceRequestsAdmin(): Promise<ServiceRequestListItem[]> {
  await assertAdminSession();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_requests")
    .select(SERVICE_REQUEST_LIST_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/service-requests] list failed", error);
    throw new Error("LIST_FAILED");
  }

  return (data ?? []) as ServiceRequestListItem[];
}

export async function getServiceRequestDetailAdmin(id: string): Promise<ServiceRequestDetail | null> {
  await assertAdminSession();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_requests")
    .select(`${SERVICE_REQUEST_ADMIN_DETAIL_SELECT}, ${ACQUISITION_DETAIL_SELECT}, ${DEMAND_DETAIL_SELECT}`)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin/service-requests/detail] fetch failed", error);
    throw new Error("DETAIL_FAILED");
  }

  if (!data) return null;

  // The select string is assembled dynamically, which exceeds Supabase's compile-time
  // PostgREST parser inference. Runtime data is still the selected row; bridge the
  // generated parser type through unknown after the database error/null checks above.
  const row = data as unknown as Omit<ServiceRequestDetail, "campaign_attribution">;
  let campaignAttribution: ServiceRequestCampaignAttribution | null = null;

  if (row.client_campaign_link_id) {
    const { data: campaign, error: campaignError } = await supabase
      .from("client_campaign_links")
      .select("id, slug, name, source, campaign_code")
      .eq("id", row.client_campaign_link_id)
      .maybeSingle();

    if (campaignError) {
      console.error("[admin/service-requests/detail] campaign attribution fetch failed", campaignError);
    } else if (campaign) {
      campaignAttribution = campaign as ServiceRequestCampaignAttribution;
    }
  }

  return {
    ...row,
    campaign_attribution: campaignAttribution,
  };
}

export async function updateServiceRequestStatusAdmin(
  id: string,
  status: string,
): Promise<{ id: string; public_id: string; status: string; updated_at: string }> {
  await assertAdminSession();

  if (!isAllowedAdminStatus(status)) {
    throw new Error("INVALID_STATUS");
  }

  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("service_requests")
    .update({ status, updated_at: nowIso })
    .eq("id", id)
    .select("id, public_id, status, updated_at")
    .maybeSingle();

  if (error) {
    console.error("[admin/service-requests/status] update failed", error);
    throw new Error("UPDATE_FAILED");
  }

  if (!data) throw new Error("NOT_FOUND");
  return data as { id: string; public_id: string; status: string; updated_at: string };
}

export async function updateServiceRequestDemandAdmin(
  id: string,
  input: ServiceRequestDemandAdminInput,
): Promise<void> {
  await assertAdminSession();
  const supabase = createSupabaseServerClient();

  const fulfillmentStatus = allowed(input.fulfillment_status, FULFILLMENT_STATUSES, "unassessed");
  const specialistAcquisitionStatus = allowed(
    input.specialist_acquisition_status,
    SPECIALIST_ACQUISITION_STATUSES,
    "not_started",
  );

  const contactMethodRaw = nullableText(input.preferred_contact_method, 30);
  const preferredContactMethod =
    contactMethodRaw && ["email", "phone", "telegram", "whatsapp", "any"].includes(contactMethodRaw)
      ? contactMethodRaw
      : null;

  const row = {
    subcategory_text: nullableText(input.subcategory_text, 300),
    requested_service: nullableText(input.requested_service, 500),
    client_budget_text: nullableText(input.client_budget_text, 200),
    preferred_contact_method: preferredContactMethod,
    existing_supply_count: nullableNonNegativeInteger(input.existing_supply_count),
    profiles_shown_count: nullableNonNegativeInteger(input.profiles_shown_count),
    external_search_required: input.external_search_required === true,
    fulfillment_status: fulfillmentStatus,
    matched_specialist_name: nullableText(input.matched_specialist_name, 300),
    matched_specialist_id: nullableText(input.matched_specialist_id, 80),
    first_response_at: nullableIso(input.first_response_at),
    matched_at: nullableIso(input.matched_at),
    closed_at: nullableIso(input.closed_at),
    loss_reason: nullableText(input.loss_reason, 1000),
    fulfillment_notes: nullableText(input.fulfillment_notes, 5000),
    external_specialist_name: nullableText(input.external_specialist_name, 300),
    external_specialist_source: nullableText(input.external_specialist_source, 300),
    external_specialist_contact: nullableText(input.external_specialist_contact, 500),
    specialist_acquisition_status: specialistAcquisitionStatus,
    specialist_acquisition_plan: nullableText(input.specialist_acquisition_plan, 100),
    specialist_registered_at: nullableIso(input.specialist_registered_at),
    specialist_became_paid_at: nullableIso(input.specialist_became_paid_at),
    specialist_acquisition_notes: nullableText(input.specialist_acquisition_notes, 5000),
    attributed_ad_cost_cents: nullableNonNegativeInteger(input.attributed_ad_cost_cents),
    attributed_revenue_cents: nullableNonNegativeInteger(input.attributed_revenue_cents),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("service_requests").update(row).eq("id", id);
  if (error) {
    console.error("[admin/service-requests/demand] update failed", error);
    throw new Error("UPDATE_FAILED");
  }
}
