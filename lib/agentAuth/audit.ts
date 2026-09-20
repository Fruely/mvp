import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AgentAuditOutcome =
  | "allowed"
  | "unauthorized"
  | "forbidden"
  | "validation_error"
  | "rate_limited"
  | "success"
  | "error";

export type AgentApiAuditEvent = {
  agentClientId?: string | null;
  credentialId?: string | null;
  requestId?: string | null;
  capability?: string | null;
  route: string;
  method: string;
  outcome: AgentAuditOutcome;
  httpStatus: number;
  metadata?: Record<string, string | number | boolean | null>;
};

function clean(value: string | null | undefined, max: number): string | null {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized.slice(0, max) : null;
}

export async function recordAgentApiAuditEvent(
  event: AgentApiAuditEvent,
): Promise<void> {
  try {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from("agent_api_audit_events").insert({
      agent_client_id: event.agentClientId ?? null,
      credential_id: event.credentialId ?? null,
      request_id: clean(event.requestId, 160),
      capability: clean(event.capability, 120),
      route: clean(event.route, 300) ?? "unknown",
      method: clean(event.method, 16) ?? "UNKNOWN",
      outcome: event.outcome,
      http_status: event.httpStatus,
      metadata: event.metadata ?? {},
    });
    if (error) {
      console.error("[agent-auth] audit insert failed", {
        code: error.code,
      });
    }
  } catch (error) {
    // Audit logging must not leak credential material or turn a successful
    // user-authorized action into a retryable duplicate.
    console.error("[agent-auth] audit write failed", error);
  }
}
