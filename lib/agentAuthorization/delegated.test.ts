import assert from "node:assert/strict";
import test from "node:test";
import type { AgentIdentity } from "../agentAuth/policy.ts";
import { FREULY_CAPABILITY_CORE } from "../agentCore/freuly.ts";
import { AGENT_USER_CONSENT_VERSION } from "../agentDelegation/consentContract.ts";
import { authorizeAgentDelegation } from "../agentDelegation/policy.ts";
import type { AuthorizedAgentDelegation } from "../agentDelegation/types.ts";
import {
  auditDescriptorForAuthorization,
  decideDelegatedAgentAuthorization,
} from "./decision.ts";
import {
  runDelegatedAuthorization,
  type DelegatedAuditEvent,
} from "./orchestrate.ts";

function capability(id: string) {
  return FREULY_CAPABILITY_CORE.capabilities.find((item) => item.id === id) ?? null;
}

function identity(
  overrides: Partial<AgentIdentity> = {},
): AgentIdentity {
  return {
    clientId: "client-1",
    credentialId: "cred-1",
    name: "Example consumer agent",
    clientType: "consumer_agent",
    provider: "example",
    scopes: ["requests:create", "requests:read", "requests:cancel"],
    specialistId: null,
    ownerUserId: "user-1",
    ...overrides,
  };
}

function delegation(
  overrides: Partial<AuthorizedAgentDelegation> = {},
): AuthorizedAgentDelegation {
  return {
    delegationId: "11111111-1111-4111-8111-111111111111",
    agentClientId: "client-1",
    userId: "user-1",
    allowedCapabilities: ["create_service_request", "get_service_request"],
    consentVersion: "1.0",
    purpose: "Find a specialist",
    grantedAt: "2026-09-20T19:00:00.000Z",
    expiresAt: "2026-09-21T20:00:00.000Z",
    ...overrides,
  };
}

test("valid consumer with scope and matching delegation is authorized", () => {
  const decision = decideDelegatedAgentAuthorization({
    capabilityId: "create_service_request",
    capability: capability("create_service_request"),
    auth: { kind: "authenticated", identity: identity() },
    delegation: { kind: "authorized", delegation: delegation() },
  });

  assert.equal(decision.kind, "authorized");
  if (decision.kind === "authorized") {
    assert.equal(decision.capability, "create_service_request");
    assert.deepEqual(decision.requiredScopes, ["requests:create"]);
    assert.equal(decision.delegation.userId, "user-1");
  }
});

test("missing or invalid credentials are unauthorized", () => {
  assert.deepEqual(
    decideDelegatedAgentAuthorization({
      capabilityId: "create_service_request",
      capability: capability("create_service_request"),
      auth: { kind: "absent" },
      delegation: null,
    }),
    { kind: "unauthorized", reason: "missing_credential" },
  );
  assert.deepEqual(
    decideDelegatedAgentAuthorization({
      capabilityId: "create_service_request",
      capability: capability("create_service_request"),
      auth: { kind: "invalid" },
      delegation: null,
    }),
    { kind: "unauthorized", reason: "invalid_credential" },
  );
});

test("valid credential with missing scope is forbidden", () => {
  const decision = decideDelegatedAgentAuthorization({
    capabilityId: "create_service_request",
    capability: capability("create_service_request"),
    auth: { kind: "forbidden", missingScopes: ["requests:create"] },
    delegation: { kind: "authorized", delegation: delegation() },
  });

  assert.deepEqual(decision, {
    kind: "forbidden",
    reason: "missing_scope",
    missingScopes: ["requests:create"],
  });
});

test("provider agent cannot use user delegation", () => {
  const decision = decideDelegatedAgentAuthorization({
    capabilityId: "create_service_request",
    capability: capability("create_service_request"),
    auth: {
      kind: "authenticated",
      identity: identity({ clientType: "provider_agent" }),
    },
    delegation: { kind: "authorized", delegation: delegation() },
  });

  assert.deepEqual(decision, {
    kind: "forbidden",
    reason: "client_type_not_allowed",
    clientType: "provider_agent",
  });
});

test("bound consumer cannot act for another user", () => {
  const decision = decideDelegatedAgentAuthorization({
    capabilityId: "create_service_request",
    capability: capability("create_service_request"),
    auth: { kind: "authenticated", identity: identity({ ownerUserId: "user-1" }) },
    delegation: {
      kind: "authorized",
      delegation: delegation({ userId: "user-2" }),
    },
  });

  assert.deepEqual(decision, {
    kind: "forbidden",
    reason: "bound_user_mismatch",
  });
});

test("business agent may use an explicit delegation for a specific user", () => {
  const decision = decideDelegatedAgentAuthorization({
    capabilityId: "create_service_request",
    capability: capability("create_service_request"),
    auth: {
      kind: "authenticated",
      identity: identity({
        clientType: "business_agent",
        ownerUserId: "owner-org",
      }),
    },
    delegation: {
      kind: "authorized",
      delegation: delegation({ userId: "user-2" }),
    },
  });

  assert.equal(decision.kind, "authorized");
});

test("create_service_request Agent authorization rejects stale consent version", async () => {
  const now = new Date("2026-09-20T20:00:00.000Z");
  const stored = {
    id: "11111111-1111-4111-8111-111111111111",
    agent_client_id: "client-1",
    user_id: "user-1",
    status: "active" as const,
    allowed_capabilities: ["create_service_request"],
    consent_version: AGENT_USER_CONSENT_VERSION,
    purpose: "Find a specialist",
    granted_at: "2026-09-20T19:00:00.000Z",
    expires_at: "2026-09-21T20:00:00.000Z",
    revoked_at: null,
  };

  const current = authorizeAgentDelegation({
    delegation: stored,
    agentClientId: "client-1",
    capability: "create_service_request",
    now,
  });
  assert.equal(current.kind, "authorized");

  const stale = authorizeAgentDelegation({
    delegation: { ...stored, consent_version: "1.0" },
    agentClientId: "client-1",
    capability: "create_service_request",
    now,
  });
  assert.deepEqual(stale, {
    kind: "invalid",
    reason: "invalid_consent_version",
  });

  const decision = decideDelegatedAgentAuthorization({
    capabilityId: "create_service_request",
    capability: capability("create_service_request"),
    auth: { kind: "authenticated", identity: identity() },
    delegation: stale,
  });
  assert.deepEqual(decision, {
    kind: "forbidden",
    reason: "invalid_delegation",
    delegationReason: "invalid_consent_version",
  });

  const result = await runDelegatedAuthorization({
    request: new Request("https://freuly.de/api/v1/agent/service-requests", {
      method: "POST",
    }),
    capabilityId: "create_service_request",
    deps: {
      resolveCredential: async () => ({
        kind: "authenticated",
        identity: identity(),
      }),
      resolveDelegation: async () => stale,
      markCredentialUsed: async () => {},
      recordAudit: async () => {},
    },
  });
  assert.deepEqual(result, {
    kind: "forbidden",
    reason: "invalid_delegation",
    delegationReason: "invalid_consent_version",
  });
});

test("revoked or expired delegation is forbidden", () => {
  const revoked = decideDelegatedAgentAuthorization({
    capabilityId: "create_service_request",
    capability: capability("create_service_request"),
    auth: { kind: "authenticated", identity: identity() },
    delegation: { kind: "invalid", reason: "inactive" },
  });
  assert.deepEqual(revoked, {
    kind: "forbidden",
    reason: "invalid_delegation",
    delegationReason: "inactive",
  });

  const expired = decideDelegatedAgentAuthorization({
    capabilityId: "create_service_request",
    capability: capability("create_service_request"),
    auth: { kind: "authenticated", identity: identity() },
    delegation: { kind: "invalid", reason: "expired" },
  });
  assert.deepEqual(expired, {
    kind: "forbidden",
    reason: "invalid_delegation",
    delegationReason: "expired",
  });
});

test("unknown and provider-only capabilities are unsupported", () => {
  assert.deepEqual(
    decideDelegatedAgentAuthorization({
      capabilityId: "not_a_capability",
      capability: null,
      auth: null,
      delegation: null,
    }),
    { kind: "unsupported", reason: "unknown_capability" },
  );

  assert.deepEqual(
    decideDelegatedAgentAuthorization({
      capabilityId: "express_interest",
      capability: capability("express_interest"),
      auth: { kind: "authenticated", identity: identity() },
      delegation: { kind: "authorized", delegation: delegation() },
    }),
    { kind: "unsupported", reason: "not_user_delegatable" },
  );
});

test("audit descriptor matches the authorization outcome", () => {
  assert.deepEqual(
    auditDescriptorForAuthorization({
      kind: "unauthorized",
      reason: "missing_credential",
    }),
    {
      outcome: "unauthorized",
      httpStatus: 401,
      metadata: { reason: "missing_credential" },
    },
  );
  assert.deepEqual(
    auditDescriptorForAuthorization({
      kind: "forbidden",
      reason: "invalid_delegation",
      delegationReason: "expired",
    }),
    {
      outcome: "forbidden",
      httpStatus: 403,
      metadata: {
        reason: "invalid_delegation",
        missing_scope_count: null,
        client_type: null,
        delegation_reason: "expired",
      },
    },
  );
  assert.equal(
    auditDescriptorForAuthorization({
      kind: "authorized",
      identity: identity(),
      delegation: delegation(),
      capability: "create_service_request",
      requiredScopes: ["requests:create"],
    }).outcome,
    "allowed",
  );
});

test("orchestrator marks last_used_at and writes audit only after full authorization", async () => {
  const audits: DelegatedAuditEvent[] = [];
  let used = 0;
  const request = new Request("https://freuly.de/api/agent/authorize", {
    method: "POST",
  });

  const authorized = await runDelegatedAuthorization({
    request,
    capabilityId: "create_service_request",
    deps: {
      resolveCredential: async () => ({
        kind: "authenticated",
        identity: identity(),
      }),
      resolveDelegation: async () => ({
        kind: "authorized",
        delegation: delegation(),
      }),
      markCredentialUsed: async () => {
        used += 1;
      },
      recordAudit: async (event) => {
        audits.push(event);
      },
    },
  });

  assert.equal(authorized.kind, "authorized");
  assert.equal(used, 1);
  assert.equal(audits.length, 1);
  assert.equal(audits[0].outcome, "allowed");
  assert.equal(audits[0].metadata?.reason, "authorized");
  assert.equal(audits[0].agentClientId, "client-1");

  used = 0;
  audits.length = 0;
  const forbidden = await runDelegatedAuthorization({
    request,
    capabilityId: "create_service_request",
    deps: {
      resolveCredential: async () => ({
        kind: "forbidden",
        missingScopes: ["requests:create"],
      }),
      resolveDelegation: async () => {
        throw new Error("delegation must not be read before scopes pass");
      },
      markCredentialUsed: async () => {
        used += 1;
      },
      recordAudit: async (event) => {
        audits.push(event);
      },
    },
  });

  assert.equal(forbidden.kind, "forbidden");
  assert.equal(used, 0);
  assert.equal(audits[0].outcome, "forbidden");
  assert.equal(audits[0].metadata?.reason, "missing_scope");
});

test("audit failure does not change an authorized decision", async () => {
  const authorized = await runDelegatedAuthorization({
    request: new Request("https://freuly.de/api/agent/authorize"),
    capabilityId: "get_service_request",
    deps: {
      resolveCredential: async () => ({
        kind: "authenticated",
        identity: identity(),
      }),
      resolveDelegation: async () => ({
        kind: "authorized",
        delegation: delegation({
          allowedCapabilities: ["get_service_request"],
        }),
      }),
      markCredentialUsed: async () => {},
      recordAudit: async () => {
        throw new Error("audit unavailable");
      },
    },
  });

  assert.equal(authorized.kind, "authorized");
});
