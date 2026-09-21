import { verifyAgentCredentialHash } from "./credentials";
import { clientScopesAreKnown } from "./scopes";

export const AGENT_CLIENT_TYPES = [
  "consumer_agent",
  "provider_agent",
  "business_agent",
  "internal_agent",
] as const;

export type AgentClientType = (typeof AGENT_CLIENT_TYPES)[number];

export type AgentCredentialRecord = {
  id: string;
  agent_client_id: string;
  key_prefix: string;
  credential_hash: string;
  status: "active" | "revoked";
  expires_at: string | null;
  revoked_at: string | null;
};

export type AgentClientRecord = {
  id: string;
  name: string;
  client_type: AgentClientType;
  provider: string | null;
  status: "active" | "disabled";
  scopes: string[];
  specialist_id: string | null;
  owner_user_id: string | null;
};

export type AgentIdentity = {
  clientId: string;
  credentialId: string;
  name: string;
  clientType: AgentClientType;
  provider: string | null;
  scopes: string[];
  specialistId: string | null;
  ownerUserId: string | null;
};

export type AgentAuthenticationDecision =
  | { kind: "authenticated"; identity: AgentIdentity }
  | { kind: "invalid" }
  | { kind: "forbidden"; missingScopes: string[] };

function normalizedScopes(scopes: readonly string[] | null | undefined) {
  return Array.from(
    new Set(
      (scopes ?? [])
        .map((scope) => scope.trim())
        .filter(Boolean),
    ),
  );
}

export function missingAgentScopes(
  grantedScopes: readonly string[],
  requiredScopes: readonly string[],
): string[] {
  const granted = new Set(normalizedScopes(grantedScopes));
  return normalizedScopes(requiredScopes).filter(
    (scope) => !granted.has(scope),
  );
}

export function authenticateAgentCredentialRecord(input: {
  rawCredential: string;
  pepper: string;
  credential: AgentCredentialRecord | null;
  client: AgentClientRecord | null;
  requiredScopes?: readonly string[];
  now?: Date;
}): AgentAuthenticationDecision {
  const { credential, client } = input;
  if (!credential || !client) return { kind: "invalid" };
  if (credential.agent_client_id !== client.id) return { kind: "invalid" };
  if (credential.status !== "active" || credential.revoked_at) {
    return { kind: "invalid" };
  }
  if (client.status !== "active") return { kind: "invalid" };
  if (!(AGENT_CLIENT_TYPES as readonly string[]).includes(client.client_type)) {
    return { kind: "invalid" };
  }

  const now = input.now ?? new Date();
  if (credential.expires_at) {
    const expiresAt = new Date(credential.expires_at).getTime();
    if (!Number.isFinite(expiresAt) || expiresAt <= now.getTime()) {
      return { kind: "invalid" };
    }
  }

  if (
    !verifyAgentCredentialHash(
      input.rawCredential,
      input.pepper,
      credential.credential_hash,
    )
  ) {
    return { kind: "invalid" };
  }

  const scopes = normalizedScopes(client.scopes);
  if (!clientScopesAreKnown(scopes)) return { kind: "invalid" };

  const missingScopes = missingAgentScopes(
    scopes,
    input.requiredScopes ?? [],
  );
  if (missingScopes.length) {
    return { kind: "forbidden", missingScopes };
  }

  return {
    kind: "authenticated",
    identity: {
      clientId: client.id,
      credentialId: credential.id,
      name: client.name,
      clientType: client.client_type,
      provider: client.provider,
      scopes,
      specialistId: client.specialist_id,
      ownerUserId: client.owner_user_id,
    },
  };
}
