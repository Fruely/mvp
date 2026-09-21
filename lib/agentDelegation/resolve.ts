import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { authorizeAgentDelegation } from "./policy";
import type {
  AgentDelegationDecision,
  AgentDelegationRecord,
  UserDelegatableCapability,
} from "./types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const AGENT_DELEGATION_HEADER = "x-freuly-delegation-id";

export function readAgentDelegationId(request: Request): string | null {
  const value = request.headers.get(AGENT_DELEGATION_HEADER)?.trim() ?? "";
  return UUID_PATTERN.test(value) ? value.toLowerCase() : null;
}

export type AgentDelegationResolution =
  | { kind: "absent" }
  | AgentDelegationDecision;

export async function resolveAgentDelegation(input: {
  request: Request;
  agentClientId: string;
  capability: UserDelegatableCapability;
}): Promise<AgentDelegationResolution> {
  const delegationId = readAgentDelegationId(input.request);
  if (!delegationId) return { kind: "absent" };

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("agent_delegations")
    .select(
      "id, agent_client_id, user_id, status, allowed_capabilities, consent_version, purpose, granted_at, expires_at, revoked_at",
    )
    .eq("id", delegationId)
    .maybeSingle();

  if (error) {
    console.error("[agent-delegation] lookup failed", {
      code: error.code,
    });
    return { kind: "invalid", reason: "missing" };
  }

  return authorizeAgentDelegation({
    delegation: data as AgentDelegationRecord | null,
    agentClientId: input.agentClientId,
    capability: input.capability,
  });
}
