import type { SupabaseClient } from "@supabase/supabase-js";

import type { AccountCapabilitiesLang } from "@/lib/account/normalizeAccountCapabilitiesLang";
import {
  IDEMPOTENCY_OWNERSHIP_CONFLICT_MESSAGE,
  resolveIdempotentReplayWithOwnership,
  type IdempotentReplayWithOwnershipResult,
} from "@/lib/mutations/idempotencyOwnership";
import { mapServiceRow } from "@/lib/specialistServices/mapServiceRow";
import { SERVICE_SELECT, type SpecialistServiceDto, type SpecialistServiceMutationResponse } from "@/lib/specialistServices/types";

export type ServiceCreateIdempotencyLookupResult =
  | { kind: "error" }
  | IdempotentReplayWithOwnershipResult;

export type ServiceCreateIdempotencyResolution =
  | { kind: "continue" }
  | { kind: "success"; status: 200; body: SpecialistServiceMutationResponse }
  | { kind: "failure"; status: number; body: Record<string, unknown> };

export async function lookupServiceCreateIdempotentReplay(
  supabase: SupabaseClient,
  clientIdempotencyKey: string,
  idempotencyFingerprint: string,
  ownerUserId: string,
): Promise<ServiceCreateIdempotencyLookupResult> {
  const { data: existingService, error } = await supabase
    .from("specialist_services")
    .select(`${SERVICE_SELECT}, client_idempotency_fingerprint, owner_user_id`)
    .eq("client_idempotency_key", clientIdempotencyKey)
    .maybeSingle();

  if (error) {
    return { kind: "error" };
  }

  return resolveIdempotentReplayWithOwnership(
    existingService
      ? {
          fingerprint:
            typeof existingService.client_idempotency_fingerprint === "string"
              ? existingService.client_idempotency_fingerprint
              : null,
          client_user_id:
            typeof existingService.owner_user_id === "string" ? existingService.owner_user_id : null,
          response: { data: mapServiceRow(existingService as Record<string, unknown>) },
        }
      : null,
    idempotencyFingerprint,
    ownerUserId,
  );
}

/** Maps idempotency replay lookup to create HTTP semantics (pre-insert and post-race). */
export async function resolveServiceCreateIdempotencyResult(
  replay: ServiceCreateIdempotencyLookupResult,
  loadReadiness: (
    supabase: SupabaseClient,
    specialistId: string,
    lang: AccountCapabilitiesLang,
  ) => Promise<{
    onboarding_gate: SpecialistServiceMutationResponse["onboarding_gate"];
    publication_ready: boolean;
    public_profile_available: boolean;
  }>,
  args: {
    supabase: SupabaseClient;
    specialistId: string;
    lang: AccountCapabilitiesLang;
  },
): Promise<ServiceCreateIdempotencyResolution> {
  if (replay.kind === "create") {
    return { kind: "continue" };
  }

  if (replay.kind === "error") {
    return { kind: "failure", status: 500, body: { error: "server_error" } };
  }

  if (replay.kind === "conflict") {
    return {
      kind: "failure",
      status: 409,
      body: { error: "Idempotency key reused with different payload" },
    };
  }

  if (replay.kind === "ownership_conflict") {
    return {
      kind: "failure",
      status: 409,
      body: { error: IDEMPOTENCY_OWNERSHIP_CONFLICT_MESSAGE },
    };
  }

  const readiness = await loadReadiness(args.supabase, args.specialistId, args.lang);
  return {
    kind: "success",
    status: 200,
    body: {
      data: replay.response.data as SpecialistServiceDto,
      ...readiness,
    },
  };
}

export function mapServiceCreateIdempotencyResolution(
  resolution: Exclude<ServiceCreateIdempotencyResolution, { kind: "continue" }>,
):
  | { ok: true; status: number; body: SpecialistServiceMutationResponse }
  | { ok: false; status: number; body: Record<string, unknown> } {
  if (resolution.kind === "success") {
    return { ok: true, status: resolution.status, body: resolution.body };
  }
  return { ok: false, status: resolution.status, body: resolution.body };
}
