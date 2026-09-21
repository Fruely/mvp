import { missingAgentScopes, type AgentClientRecord } from "@/lib/agentAuth/policy";
import { FREULY_CAPABILITY_CORE } from "@/lib/agentCore/freuly";
import type { CapabilityDefinition } from "@/lib/agentCore/types";
import type { UserDelegatableCapability } from "./types";

/**
 * Existing invariants this consent API must preserve:
 * - USER_DELEGATABLE_CAPABILITIES is the DB/foundation vocabulary and includes
 *   capabilities that are not live yet. Runtime consent must not grant them.
 * - authorizeAgentDelegation() checks the stored row only (same agent, active,
 *   capability set, expiry). Client type, owner binding and scopes are enforced
 *   here at grant time and again by runDelegatedAuthorization at Agent write.
 * - Admin provisioning issues principals/credentials. It must never manufacture
 *   user consent. These routes authenticate only via resolveBearerAuthUser.
 * - agent_delegations is revoke/expire only. No DELETE. user_id is never taken
 *   from a request body.
 */
export const AGENT_USER_CONSENT_VERSION = "agent-delegation-v1";

export const ENABLED_USER_DELEGATION_CAPABILITIES = [
  "create_service_request",
] as const;

export type EnabledUserDelegationCapability =
  (typeof ENABLED_USER_DELEGATION_CAPABILITIES)[number];

const ENABLED_SET = new Set<string>(ENABLED_USER_DELEGATION_CAPABILITIES);

export function isEnabledUserDelegationCapability(
  value: string,
): value is EnabledUserDelegationCapability {
  return ENABLED_SET.has(value);
}

export function capabilityFromCore(id: string): CapabilityDefinition | null {
  return FREULY_CAPABILITY_CORE.capabilities.find((item) => item.id === id) ?? null;
}

export function isUserConsentableAgent(
  client: Pick<AgentClientRecord, "status" | "client_type" | "owner_user_id">,
  userId: string,
): boolean {
  if (client.status !== "active") return false;
  if (client.client_type === "business_agent") return true;
  if (client.client_type === "consumer_agent") {
    return client.owner_user_id != null && client.owner_user_id === userId;
  }
  return false;
}

export type CapabilityGrantFailure =
  | "capability_not_enabled"
  | "unknown_capability"
  | "consent_not_explicit_user"
  | "capability_not_allowed_for_client_type"
  | "agent_missing_required_scope";

export function verifyCapabilityGrant(
  capabilityId: string,
  client: Pick<AgentClientRecord, "client_type" | "scopes">,
):
  | { ok: true; capability: CapabilityDefinition }
  | { ok: false; error: CapabilityGrantFailure } {
  if (!isEnabledUserDelegationCapability(capabilityId)) {
    return {
      ok: false,
      error: isUserDelegatableFoundationCapability(capabilityId)
        ? "capability_not_enabled"
        : "unknown_capability",
    };
  }

  const capability = capabilityFromCore(capabilityId);
  if (!capability) return { ok: false, error: "unknown_capability" };
  if (capability.consent?.type !== "explicit_user_authorization") {
    return { ok: false, error: "consent_not_explicit_user" };
  }
  if (!capability.audience.includes(client.client_type)) {
    return { ok: false, error: "capability_not_allowed_for_client_type" };
  }
  const missing = missingAgentScopes(
    client.scopes,
    capability.required_scopes ?? [],
  );
  if (missing.length) {
    return { ok: false, error: "agent_missing_required_scope" };
  }
  return { ok: true, capability };
}

export function grantableConsentCapabilities(
  client: Pick<AgentClientRecord, "client_type" | "scopes">,
): Array<{ id: EnabledUserDelegationCapability; description: string }> {
  const listed: Array<{
    id: EnabledUserDelegationCapability;
    description: string;
  }> = [];
  for (const id of ENABLED_USER_DELEGATION_CAPABILITIES) {
    const verified = verifyCapabilityGrant(id, client);
    if (!verified.ok) continue;
    listed.push({
      id,
      description: verified.capability.description,
    });
  }
  return listed;
}

function isUserDelegatableFoundationCapability(value: string): boolean {
  return (
    value === "get_service_request" ||
    value === "cancel_service_request" ||
    value === "get_match" ||
    value === "accept_match" ||
    value === "decline_match" ||
    value === "create_service_request"
  );
}

export type { UserDelegatableCapability };
