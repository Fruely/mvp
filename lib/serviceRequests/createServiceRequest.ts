import type { SupabaseClient } from "@supabase/supabase-js";

import type { AcquisitionFirstTouch } from "@/lib/acquisition/firstTouch";
import {
  buildClientIdempotencyFingerprint,
  isUniqueViolation,
  normalizeClientIdempotencyKey,
} from "@/lib/mutations/clientIdempotency";
import {
  IDEMPOTENCY_OWNERSHIP_CONFLICT_MESSAGE,
  resolveIdempotentReplayWithOwnership,
  type IdempotentReplayWithOwnershipResult,
} from "@/lib/mutations/idempotencyOwnership";
import { SERVICE_REQUEST_SOURCE } from "@/lib/serviceRequests/constants";
import { generateServiceRequestPublicId } from "@/lib/serviceRequests/publicId";
import { buildOwnerTelegramTimingPayload } from "@/lib/serviceRequests/ownerTelegramTiming";
import type { NewServiceRequestOwnerPayload } from "@/lib/serviceRequests/ownerTelegramMessage";
import type { ValidatedServiceRequestCreate } from "@/lib/serviceRequests/validation";

export { IDEMPOTENCY_OWNERSHIP_CONFLICT_MESSAGE };

const PUBLIC_ID_RETRY_LIMIT = 5;

export type ServiceRequestCreateResponse = {
  ok: true;
  public_id: string;
  created_at: string;
};

export type ServiceRequestCreateResult =
  | { kind: "created"; public_id: string; created_at: string }
  | { kind: "replayed"; public_id: string; created_at: string }
  | { kind: "conflict" }
  | { kind: "ownership_conflict" }
  | { kind: "error" };

export type ServiceRequestCreateInput = {
  supabase: SupabaseClient;
  validated: ValidatedServiceRequestCreate;
  clientUserId: string | null;
  idempotencyKey?: unknown;
  acquisition?: AcquisitionFirstTouch | null;
  clientCampaignLinkId?: string | null;
  nowIso?: string;
  generatePublicId?: (now?: Date) => string;
};

type NotifyCreatedFn = (
  eventType: "NEW_SERVICE_REQUEST",
  payload: NewServiceRequestOwnerPayload,
) => Promise<unknown> | unknown;

function buildServiceRequestIdempotencyPayload(validated: ValidatedServiceRequestCreate) {
  return {
    client_name: validated.client_name,
    client_email: validated.client_email,
    client_phone: validated.client_phone,
    category_id: validated.category_id,
    category_text: validated.category_text,
    description: validated.description,
    preferred_language: validated.preferred_language,
    work_format: validated.work_format,
    city: validated.city,
    postal_code: validated.postal_code,
    country_code: validated.country_code,
    radius_km: validated.radius_km,
    urgency: validated.urgency,
    desired_date: validated.desired_date,
    service_timing: validated.service_timing,
    locale: validated.locale,
    source_path: validated.source_path,
  };
}

export function buildServiceRequestIdempotencyFingerprint(
  validated: ValidatedServiceRequestCreate,
): string {
  return buildClientIdempotencyFingerprint(buildServiceRequestIdempotencyPayload(validated));
}

function replayResponseFromRow(row: {
  public_id: unknown;
  created_at: unknown;
}): ServiceRequestCreateResponse {
  return {
    ok: true,
    public_id: String(row.public_id),
    created_at: String(row.created_at),
  };
}

export async function lookupServiceRequestIdempotentReplay(
  supabase: SupabaseClient,
  clientIdempotencyKey: string,
  idempotencyFingerprint: string,
  clientUserId: string | null,
): Promise<IdempotentReplayWithOwnershipResult | { kind: "error" }> {
  const { data: existingRequest, error: existingError } = await supabase
    .from("service_requests")
    .select("public_id, created_at, client_idempotency_fingerprint, client_user_id")
    .eq("client_idempotency_key", clientIdempotencyKey)
    .maybeSingle();

  if (existingError) return { kind: "error" };

  return resolveIdempotentReplayWithOwnership(
    existingRequest
      ? {
          fingerprint:
            typeof existingRequest.client_idempotency_fingerprint === "string"
              ? existingRequest.client_idempotency_fingerprint
              : null,
          client_user_id:
            typeof existingRequest.client_user_id === "string"
              ? existingRequest.client_user_id
              : null,
          response: replayResponseFromRow(existingRequest),
        }
      : null,
    idempotencyFingerprint,
    clientUserId,
  );
}

function mapReplayResult(
  replay: IdempotentReplayWithOwnershipResult | { kind: "error" },
): ServiceRequestCreateResult | { kind: "create" } {
  if (replay.kind === "replay") {
    const response = replay.response as ServiceRequestCreateResponse;
    return {
      kind: "replayed",
      public_id: response.public_id,
      created_at: response.created_at,
    };
  }
  if (replay.kind === "conflict" || replay.kind === "ownership_conflict" || replay.kind === "error") {
    return replay;
  }
  return { kind: "create" };
}

export async function persistNewServiceRequest(
  input: ServiceRequestCreateInput,
): Promise<ServiceRequestCreateResult> {
  const clientIdempotencyKey = normalizeClientIdempotencyKey(input.idempotencyKey);
  const idempotencyFingerprint = buildServiceRequestIdempotencyFingerprint(input.validated);
  const nowIso = input.nowIso ?? new Date().toISOString();
  const generatePublicId = input.generatePublicId ?? generateServiceRequestPublicId;
  const acquisition = input.acquisition ?? null;
  const validated = input.validated;

  for (let attempt = 0; attempt < PUBLIC_ID_RETRY_LIMIT; attempt += 1) {
    const public_id = generatePublicId();
    const row = {
      public_id,
      client_name: validated.client_name,
      client_email: validated.client_email,
      client_phone: validated.client_phone,
      category_id: validated.category_id,
      category_text: validated.category_text,
      description: validated.description,
      requested_service: validated.requested_service,
      subcategory_text: validated.subcategory_text,
      client_budget_text: validated.client_budget_text,
      preferred_contact_method: validated.preferred_contact_method,
      preferred_language: validated.preferred_language,
      service_languages: validated.service_languages ?? [],
      work_format: validated.work_format,
      city: validated.city,
      postal_code: validated.postal_code,
      country_code: validated.country_code,
      radius_km: validated.radius_km,
      urgency: validated.urgency,
      desired_date: validated.desired_date,
      service_timing_type: validated.service_timing.service_timing_type,
      service_timing_date: validated.service_timing.service_timing_date,
      service_timing_time: validated.service_timing.service_timing_time,
      service_timing_date_end: validated.service_timing.service_timing_date_end,
      service_timing_period: validated.service_timing.service_timing_period,
      service_timing_note: validated.service_timing.service_timing_note,
      locale: validated.locale,
      source: SERVICE_REQUEST_SOURCE,
      source_path: validated.source_path,
      client_campaign_link_id: input.clientCampaignLinkId ?? null,
      acquisition_source: acquisition?.source ?? null,
      acquisition_medium: acquisition?.medium ?? null,
      acquisition_campaign: acquisition?.campaign ?? null,
      acquisition_content: acquisition?.content ?? null,
      acquisition_term: acquisition?.term ?? null,
      acquisition_gclid: acquisition?.gclid ?? null,
      acquisition_fbclid: acquisition?.fbclid ?? null,
      acquisition_referrer: acquisition?.referrer ?? null,
      acquisition_landing_path: acquisition?.landing_path ?? null,
      acquisition_captured_at: acquisition?.captured_at ?? null,
      client_user_id: input.clientUserId,
      status: "new",
      updated_at: nowIso,
      ...(clientIdempotencyKey
        ? {
            client_idempotency_key: clientIdempotencyKey,
            client_idempotency_fingerprint: idempotencyFingerprint,
          }
        : {}),
    };

    const { data, error } = await input.supabase
      .from("service_requests")
      .insert(row)
      .select("public_id, created_at")
      .single();

    if (!error && data) {
      return {
        kind: "created",
        public_id: String(data.public_id),
        created_at: String(data.created_at),
      };
    }

    if (!isUniqueViolation(error)) {
      console.error("[service-requests/create] insert failed", error);
      return { kind: "error" };
    }

    if (clientIdempotencyKey) {
      const replay = mapReplayResult(
        await lookupServiceRequestIdempotentReplay(
          input.supabase,
          clientIdempotencyKey,
          idempotencyFingerprint,
          input.clientUserId,
        ),
      );
      if (replay.kind !== "create") {
        return replay;
      }
    }
  }

  console.error("[service-requests/create] public_id collision retries exhausted");
  return { kind: "error" };
}

export async function createServiceRequest(
  input: ServiceRequestCreateInput,
): Promise<ServiceRequestCreateResult> {
  const clientIdempotencyKey = normalizeClientIdempotencyKey(input.idempotencyKey);
  const idempotencyFingerprint = buildServiceRequestIdempotencyFingerprint(input.validated);

  if (clientIdempotencyKey) {
    const replay = mapReplayResult(
      await lookupServiceRequestIdempotentReplay(
        input.supabase,
        clientIdempotencyKey,
        idempotencyFingerprint,
        input.clientUserId,
      ),
    );
    if (replay.kind !== "create") {
      return replay;
    }
  }

  return persistNewServiceRequest(input);
}

export async function notifyIfServiceRequestCreated(
  result: ServiceRequestCreateResult,
  validated: ValidatedServiceRequestCreate,
  notify: NotifyCreatedFn,
): Promise<void> {
  if (result.kind !== "created") return;

  const timingPayload = buildOwnerTelegramTimingPayload(validated);
  await notify("NEW_SERVICE_REQUEST", {
    public_id: result.public_id,
    category_text: validated.category_text,
    preferred_language: validated.preferred_language,
    work_format: validated.work_format,
    city: validated.city,
    postal_code: validated.postal_code,
    when_label: timingPayload.when_label,
    urgency: timingPayload.urgency,
    created_at: result.created_at,
    locale: validated.locale,
  });
}
