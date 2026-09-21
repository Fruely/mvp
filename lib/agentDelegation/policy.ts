import { AGENT_USER_CONSENT_VERSION } from "./consentContract";
import {
  USER_DELEGATABLE_CAPABILITIES,
  type AgentDelegationDecision,
  type AgentDelegationRecord,
  type UserDelegatableCapability,
} from "./types";

const CAPABILITY_SET = new Set<string>(USER_DELEGATABLE_CAPABILITIES);

export function isUserDelegatableCapability(
  value: string,
): value is UserDelegatableCapability {
  return CAPABILITY_SET.has(value);
}

function normalizeCapabilities(
  values: readonly string[],
): UserDelegatableCapability[] | null {
  const unique: UserDelegatableCapability[] = [];
  const seen = new Set<string>();

  for (const raw of values) {
    const value = raw.trim();
    if (!value || !isUserDelegatableCapability(value)) return null;
    if (seen.has(value)) continue;
    seen.add(value);
    unique.push(value);
  }

  return unique.length ? unique : null;
}

function parseTime(value: string): number | null {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export function authorizeAgentDelegation(input: {
  delegation: AgentDelegationRecord | null;
  agentClientId: string;
  capability: UserDelegatableCapability;
  now?: Date;
}): AgentDelegationDecision {
  const delegation = input.delegation;
  if (!delegation) {
    return { kind: "invalid", reason: "missing" };
  }

  if (delegation.agent_client_id !== input.agentClientId) {
    return { kind: "invalid", reason: "client_mismatch" };
  }

  if (delegation.status !== "active" || delegation.revoked_at) {
    return { kind: "invalid", reason: "inactive" };
  }

  const now = (input.now ?? new Date()).getTime();
  const grantedAt = parseTime(delegation.granted_at);
  if (grantedAt == null) {
    return { kind: "invalid", reason: "invalid_timestamp" };
  }
  if (grantedAt > now) {
    return { kind: "invalid", reason: "not_yet_granted" };
  }

  if (delegation.expires_at) {
    const expiresAt = parseTime(delegation.expires_at);
    if (expiresAt == null) {
      return { kind: "invalid", reason: "invalid_timestamp" };
    }
    if (expiresAt <= now) {
      return { kind: "invalid", reason: "expired" };
    }
  }

  const consentVersion = delegation.consent_version.trim();
  if (
    !consentVersion ||
    consentVersion.length > 64 ||
    consentVersion !== AGENT_USER_CONSENT_VERSION
  ) {
    return { kind: "invalid", reason: "invalid_consent_version" };
  }

  const allowedCapabilities = normalizeCapabilities(
    delegation.allowed_capabilities,
  );
  if (!allowedCapabilities) {
    return { kind: "invalid", reason: "invalid_capability_set" };
  }

  if (!allowedCapabilities.includes(input.capability)) {
    return {
      kind: "forbidden",
      capability: input.capability,
    };
  }

  return {
    kind: "authorized",
    delegation: {
      delegationId: delegation.id,
      agentClientId: delegation.agent_client_id,
      userId: delegation.user_id,
      allowedCapabilities,
      consentVersion,
      purpose: delegation.purpose,
      grantedAt: delegation.granted_at,
      expiresAt: delegation.expires_at,
    },
  };
}
