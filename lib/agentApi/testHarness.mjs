export const agentHarness = {
  auth: { kind: "absent" },
  delegation: { kind: "absent" },
  markUsedCalls: [],
  auditEvents: [],
  auditShouldFail: false,
  rateLimitAllowed: true,
  rateLimitCalls: [],
};

export function resetAgentHarness() {
  agentHarness.auth = { kind: "absent" };
  agentHarness.delegation = { kind: "absent" };
  agentHarness.markUsedCalls = [];
  agentHarness.auditEvents = [];
  agentHarness.auditShouldFail = false;
  agentHarness.rateLimitAllowed = true;
  agentHarness.rateLimitCalls = [];
}

export function authorizedConsumer(overrides = {}) {
  return {
    kind: "authenticated",
    identity: {
      clientId: "client-consumer-1",
      credentialId: "cred-consumer-1",
      name: "Example consumer agent",
      clientType: "consumer_agent",
      provider: "example",
      scopes: ["requests:create"],
      specialistId: null,
      ownerUserId: "user-owner-1",
      ...overrides.identity,
    },
  };
}

export function authorizedBusiness(overrides = {}) {
  return {
    kind: "authenticated",
    identity: {
      clientId: "client-business-1",
      credentialId: "cred-business-1",
      name: "Example business agent",
      clientType: "business_agent",
      provider: "example",
      scopes: ["requests:create"],
      specialistId: null,
      ownerUserId: "org-owner-1",
      ...overrides.identity,
    },
  };
}

export function authorizedDelegation(overrides = {}) {
  return {
    kind: "authorized",
    delegation: {
      delegationId: "11111111-1111-4111-8111-111111111111",
      agentClientId: "client-consumer-1",
      userId: "user-owner-1",
      allowedCapabilities: ["create_service_request"],
      consentVersion: "1.0",
      purpose: "Find a specialist",
      grantedAt: "2026-09-20T19:00:00.000Z",
      expiresAt: "2026-09-21T20:00:00.000Z",
      ...overrides,
    },
  };
}
