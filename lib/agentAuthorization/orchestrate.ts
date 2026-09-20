import type { AgentAuditMetadata } from "@/lib/agentAuth/auditMetadata";
import { FREULY_CAPABILITY_CORE } from "@/lib/agentCore/freuly";
import { isUserDelegatableCapability } from "@/lib/agentDelegation/policy";
import type { UserDelegatableCapability } from "@/lib/agentDelegation/types";
import type { AgentAuthLookup, AgentAuditOutcome } from "./decision";
import {
  auditDescriptorForAuthorization,
  decideDelegatedAgentAuthorization,
  type AgentDelegationLookup,
  type DelegatedAgentAuthorization,
} from "./decision";

export type DelegatedAuditEvent = {
  agentClientId?: string | null;
  credentialId?: string | null;
  requestId?: string | null;
  capability?: string | null;
  route: string;
  method: string;
  outcome: AgentAuditOutcome;
  httpStatus: number;
  metadata?: AgentAuditMetadata;
};

export type DelegatedAuthorizationDependencies = {
  resolveCredential: (
    request: Request,
    requiredScopes: readonly string[],
  ) => Promise<AgentAuthLookup>;
  resolveDelegation: (input: {
    request: Request;
    agentClientId: string;
    capability: UserDelegatableCapability;
  }) => Promise<AgentDelegationLookup>;
  markCredentialUsed: (credentialId: string) => Promise<void>;
  recordAudit: (event: DelegatedAuditEvent) => Promise<void>;
};

function getCapability(id: string) {
  return FREULY_CAPABILITY_CORE.capabilities.find((capability) => capability.id === id) ?? null;
}

function requestRoute(request: Request): string {
  try {
    return new URL(request.url).pathname || "agent.authorization";
  } catch {
    return "agent.authorization";
  }
}

function authenticatedPrincipal(auth: AgentAuthLookup | null): {
  clientId: string;
  credentialId: string;
} | null {
  return auth?.kind === "authenticated"
    ? {
        clientId: auth.identity.clientId,
        credentialId: auth.identity.credentialId,
      }
    : null;
}

export async function runDelegatedAuthorization(input: {
  request: Request;
  capabilityId: string;
  deps: DelegatedAuthorizationDependencies;
}): Promise<DelegatedAgentAuthorization> {
  const capability = getCapability(input.capabilityId);
  let auth: AgentAuthLookup | null = null;

  let decision = decideDelegatedAgentAuthorization({
    capabilityId: input.capabilityId,
    capability,
    auth,
    delegation: null,
  });

  if (decision.kind !== "unsupported") {
    auth = await input.deps.resolveCredential(
      input.request,
      capability?.required_scopes ?? [],
    );
    decision = decideDelegatedAgentAuthorization({
      capabilityId: input.capabilityId,
      capability,
      auth,
      delegation: null,
    });

    if (
      decision.kind === "forbidden" &&
      decision.reason === "delegation_required" &&
      auth.kind === "authenticated" &&
      capability &&
      isUserDelegatableCapability(capability.id)
    ) {
      const delegation = await input.deps.resolveDelegation({
        request: input.request,
        agentClientId: auth.identity.clientId,
        capability: capability.id,
      });
      decision = decideDelegatedAgentAuthorization({
        capabilityId: input.capabilityId,
        capability,
        auth,
        delegation,
      });
    }
  }

  if (decision.kind === "authorized") {
    try {
      await input.deps.markCredentialUsed(decision.identity.credentialId);
    } catch (error) {
      const name = error instanceof Error ? error.name : "unknown";
      console.error("[agent-authz] last_used_at update failed", { name });
    }
  }

  const audit = auditDescriptorForAuthorization(decision);
  const principal = authenticatedPrincipal(auth);
  try {
    await input.deps.recordAudit({
      agentClientId: principal?.clientId ?? null,
      credentialId: principal?.credentialId ?? null,
      capability: input.capabilityId,
      route: requestRoute(input.request),
      method: input.request.method || "AUTHORIZE",
      outcome: audit.outcome,
      httpStatus: audit.httpStatus,
      metadata: audit.metadata,
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "unknown";
    console.error("[agent-authz] audit write failed", { name });
  }

  return decision;
}
