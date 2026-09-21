import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getClientRequestHistoryDetail,
  type ClientRequestHistoryDetail,
} from "@/lib/clientRequests/historyService";
import {
  CLIENT_CANCELLABLE_SERVICE_REQUEST_STATUSES,
  CLIENT_CANCELLED_SERVICE_REQUEST_STATUS,
  isClientCancelledServiceRequestStatus,
} from "@/lib/serviceRequests/cancelPolicy";
import type { ServiceRequestStatus } from "@/lib/serviceRequests/constants";

export type OwnedServiceRequest = ClientRequestHistoryDetail;

export type CancelOwnedServiceRequestResult =
  | {
      kind: "cancelled";
      public_id: string;
      status: typeof CLIENT_CANCELLED_SERVICE_REQUEST_STATUS;
      updated_at: string;
    }
  | {
      kind: "already_cancelled";
      public_id: string;
      status: typeof CLIENT_CANCELLED_SERVICE_REQUEST_STATUS;
      updated_at: string;
    }
  | { kind: "not_found" }
  | { kind: "not_cancellable"; status: string }
  | { kind: "error" };

export async function getOwnedServiceRequest(
  supabase: SupabaseClient,
  userId: string,
  publicId: string,
): Promise<OwnedServiceRequest | null> {
  if (!userId.trim() || !publicId.trim()) return null;

  return getClientRequestHistoryDetail(supabase, userId, "service_request", publicId);
}

function cancelledResult(
  kind: "cancelled" | "already_cancelled",
  row: { public_id: unknown; updated_at: unknown },
): CancelOwnedServiceRequestResult {
  return {
    kind,
    public_id: String(row.public_id),
    status: CLIENT_CANCELLED_SERVICE_REQUEST_STATUS,
    updated_at: String(row.updated_at),
  };
}

async function loadOwnedServiceRequestStatus(
  supabase: SupabaseClient,
  userId: string,
  publicId: string,
): Promise<{ public_id: string; status: string; updated_at: string } | null | "error"> {
  const { data, error } = await supabase
    .from("service_requests")
    .select("public_id, status, updated_at")
    .eq("public_id", publicId)
    .eq("client_user_id", userId)
    .maybeSingle();

  if (error) return "error";
  if (!data) return null;

  return {
    public_id: String(data.public_id),
    status: typeof data.status === "string" ? data.status : "",
    updated_at: String(data.updated_at ?? ""),
  };
}

export async function cancelOwnedServiceRequest(
  supabase: SupabaseClient,
  userId: string,
  publicId: string,
  nowIso = new Date().toISOString(),
): Promise<CancelOwnedServiceRequestResult> {
  const ownerId = userId.trim();
  const requestId = publicId.trim();
  if (!ownerId || !requestId) return { kind: "not_found" };

  const { data, error } = await supabase
    .from("service_requests")
    .update({
      status: CLIENT_CANCELLED_SERVICE_REQUEST_STATUS,
      updated_at: nowIso,
    })
    .eq("public_id", requestId)
    .eq("client_user_id", ownerId)
    .in("status", [...CLIENT_CANCELLABLE_SERVICE_REQUEST_STATUSES])
    .select("public_id, status, updated_at")
    .maybeSingle();

  if (error) {
    console.error("[service-requests/cancel] update failed", error);
    return { kind: "error" };
  }

  if (data) {
    return cancelledResult("cancelled", data);
  }

  const existing = await loadOwnedServiceRequestStatus(supabase, ownerId, requestId);
  if (existing === "error") return { kind: "error" };
  if (!existing) return { kind: "not_found" };

  if (isClientCancelledServiceRequestStatus(existing.status)) {
    return cancelledResult("already_cancelled", existing);
  }

  return {
    kind: "not_cancellable",
    status: existing.status as ServiceRequestStatus | string,
  };
}
