export const USER_DELEGATABLE_CAPABILITIES = [
  "create_service_request",
  "get_service_request",
  "cancel_service_request",
  "get_match",
  "accept_match",
  "decline_match",
] as const;

export type UserDelegatableCapability =
  (typeof USER_DELEGATABLE_CAPABILITIES)[number];

export type AgentDelegationStatus = "active" | "revoked";

export type AgentDelegationRecord = {
  id: string;
  agent_client_id: string;
  user_id: string;
  status: AgentDelegationStatus;
  allowed_capabilities: string[];
  consent_version: string;
  purpose: string | null;
  granted_at: string;
  expires_at: string | null;
  revoked_at: string | null;
};

export type AuthorizedAgentDelegation = {
  delegationId: string;
  agentClientId: string;
  userId: string;
  allowedCapabilities: UserDelegatableCapability[];
  consentVersion: string;
  purpose: string | null;
  grantedAt: string;
  expiresAt: string | null;
};

export type AgentDelegationDecision =
  | {
      kind: "authorized";
      delegation: AuthorizedAgentDelegation;
    }
  | {
      kind: "invalid";
      reason:
        | "missing"
        | "client_mismatch"
        | "inactive"
        | "invalid_timestamp"
        | "not_yet_granted"
        | "expired"
        | "invalid_consent_version"
        | "invalid_capability_set";
    }
  | {
      kind: "forbidden";
      capability: UserDelegatableCapability;
    };
