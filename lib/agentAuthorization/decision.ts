import type { AgentAuditMetadata } from "@/lib/agentAuth/auditMetadata";
import type {
  AgentAuthenticationDecision,
  AgentIdentity,
} from "@/lib/agentAuth/policy";
import type { CapabilityDefinition } from "@/lib/agentCore/types";
import { isUserDelegatableCapability } from "@/lib/agentDelegation/policy";
import type {
  AgentDelegationDecision,
  AuthorizedAgentDelegation,
  UserDelegatableCapability,
} from "@/lib/agentDelegation/types";

export type AgentAuthLookup =
  | { kind: "absent" }
  | AgentAuthenticationDecision;

export type AgentDelegationLookup =
  | { kind: "absent" }
  | AgentDelegationDecision;

export type AgentAuditOutcome =
  | "allowed"
  | "unauthorized"
  | "forbidden"
  | "validation_error"
  | "rate_limited"
  | "success"
  | "error";

export type DelegatedAgentAuthorization =
  | {
      kind: "authorized";
      identity: AgentIdentity;
      delegation: AuthorizedAgentDelegation;
      capability: UserDelegatableCapability;
      requiredScopes: string[];
    }
  | {
      kind: "unauthorized";
      reason: "missing_credential" | "invalid_credential";
    }
  | {
      kind: "forbidden";
      reason:
        | "missing_scope"
        | "client_type_not_allowed"
        | "delegation_required"
        | "invalid_delegation"
        | "capability_not_delegated"
        | "bound_user_mismatch";
      missingScopes?: string[];
      delegationReason?: string;
      clientType?: string;
    }
  | {
      kind: "unsupported";
      reason: "unknown_capability" | "not_user_delegatable";
    };

export const USER_DELEGATION_CLIENT_TYPES = new Set([
  "consumer_agent",
  "business_agent",
]);

export function decideDelegatedAgentAuthorization(input: {
  capabilityId: string;
  capability: CapabilityDefinition | null;
  auth: AgentAuthLookup | null;
  delegation: AgentDelegationLookup | null;
}): DelegatedAgentAuthorization {
  const capability = input.capability;
  if (!capability) {
    return { kind: "unsupported", reason: "unknown_capability" };
  }
  if (!isUserDelegatableCapability(capability.id)) {
    return { kind: "unsupported", reason: "not_user_delegatable" };
  }

  const requiredScopes = capability.required_scopes ?? [];
  const auth = input.auth;
  if (!auth || auth.kind === "absent") {
    return { kind: "unauthorized", reason: "missing_credential" };
  }
  if (auth.kind === "invalid") {
    return { kind: "unauthorized", reason: "invalid_credential" };
  }
  if (auth.kind === "forbidden") {
    return {
      kind: "forbidden",
      reason: "missing_scope",
      missingScopes: auth.missingScopes,
    };
  }

  const identity = auth.identity;
  if (
    !USER_DELEGATION_CLIENT_TYPES.has(identity.clientType) ||
    !capability.audience.includes(identity.clientType)
  ) {
    return {
      kind: "forbidden",
      reason: "client_type_not_allowed",
      clientType: identity.clientType,
    };
  }

  const delegation = input.delegation;
  if (!delegation || delegation.kind === "absent") {
    return { kind: "forbidden", reason: "delegation_required" };
  }
  if (delegation.kind === "invalid") {
    return {
      kind: "forbidden",
      reason: "invalid_delegation",
      delegationReason: delegation.reason,
    };
  }
  if (delegation.kind === "forbidden") {
    return { kind: "forbidden", reason: "capability_not_delegated" };
  }

  // Bound consumer_agent may act only for its ownerUserId.
  // business_agent is multi-user: ownerUserId is not the delegated-user constraint.
  if (
    identity.clientType === "consumer_agent" &&
    identity.ownerUserId != null &&
    delegation.delegation.userId !== identity.ownerUserId
  ) {
    return { kind: "forbidden", reason: "bound_user_mismatch" };
  }

  return {
    kind: "authorized",
    identity,
    delegation: delegation.delegation,
    capability: capability.id,
    requiredScopes: [...requiredScopes],
  };
}

export function auditDescriptorForAuthorization(
  decision: DelegatedAgentAuthorization,
): {
  outcome: AgentAuditOutcome;
  httpStatus: number;
  metadata: AgentAuditMetadata;
} {
  if (decision.kind === "authorized") {
    return {
      outcome: "allowed",
      httpStatus: 200,
      metadata: {
        reason: "authorized",
        client_type: decision.identity.clientType,
      },
    };
  }

  if (decision.kind === "unauthorized") {
    return {
      outcome: "unauthorized",
      httpStatus: 401,
      metadata: { reason: decision.reason },
    };
  }

  if (decision.kind === "unsupported") {
    return {
      outcome: "validation_error",
      httpStatus: 400,
      metadata: { reason: decision.reason },
    };
  }

  return {
    outcome: "forbidden",
    httpStatus: 403,
    metadata: {
      reason: decision.reason,
      missing_scope_count: decision.missingScopes?.length ?? null,
      client_type: decision.clientType ?? null,
      delegation_reason: decision.delegationReason ?? null,
    },
  };
}
