import assert from "node:assert/strict";
import test from "node:test";
import { AGENT_USER_CONSENT_VERSION } from "./consentContract.ts";
import {
  authorizeAgentDelegation,
  isUserDelegatableCapability,
} from "./policy.ts";
import type { AgentDelegationRecord } from "./types.ts";

const NOW = new Date("2026-09-20T20:00:00.000Z");

function record(
  overrides: Partial<AgentDelegationRecord> = {},
): AgentDelegationRecord {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    agent_client_id: "22222222-2222-4222-8222-222222222222",
    user_id: "33333333-3333-4333-8333-333333333333",
    status: "active",
    allowed_capabilities: ["create_service_request", "get_service_request"],
    consent_version: AGENT_USER_CONSENT_VERSION,
    purpose: "Find a suitable specialist",
    granted_at: "2026-09-20T19:00:00.000Z",
    expires_at: "2026-09-21T20:00:00.000Z",
    revoked_at: null,
    ...overrides,
  };
}

test("delegation authorizes only an explicitly allowed capability for the same agent", () => {
  const result = authorizeAgentDelegation({
    delegation: record(),
    agentClientId: "22222222-2222-4222-8222-222222222222",
    capability: "create_service_request",
    now: NOW,
  });

  assert.equal(result.kind, "authorized");
  if (result.kind === "authorized") {
    assert.equal(result.delegation.userId, "33333333-3333-4333-8333-333333333333");
    assert.deepEqual(result.delegation.allowedCapabilities, [
      "create_service_request",
      "get_service_request",
    ]);
  }
});

test("delegation rejects a different agent client", () => {
  const result = authorizeAgentDelegation({
    delegation: record(),
    agentClientId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    capability: "create_service_request",
    now: NOW,
  });
  assert.deepEqual(result, { kind: "invalid", reason: "client_mismatch" });
});

test("delegation rejects revoked, expired, future and malformed records", () => {
  const cases: Array<[Partial<AgentDelegationRecord>, string]> = [
    [{ status: "revoked", revoked_at: "2026-09-20T19:30:00.000Z" }, "inactive"],
    [{ expires_at: "2026-09-20T20:00:00.000Z" }, "expired"],
    [{ granted_at: "2026-09-20T21:00:00.000Z" }, "not_yet_granted"],
    [{ granted_at: "not-a-date" }, "invalid_timestamp"],
    [{ expires_at: "not-a-date" }, "invalid_timestamp"],
    [{ consent_version: "   " }, "invalid_consent_version"],
    [{ allowed_capabilities: [] }, "invalid_capability_set"],
    [{ allowed_capabilities: ["create_service_request", "admin_everything"] }, "invalid_capability_set"],
  ];

  for (const [overrides, reason] of cases) {
    const result = authorizeAgentDelegation({
      delegation: record(overrides),
      agentClientId: "22222222-2222-4222-8222-222222222222",
      capability: "create_service_request",
      now: NOW,
    });
    assert.deepEqual(result, { kind: "invalid", reason });
  }
});

test("valid delegation still forbids capabilities the user did not grant", () => {
  const result = authorizeAgentDelegation({
    delegation: record({ allowed_capabilities: ["get_service_request"] }),
    agentClientId: "22222222-2222-4222-8222-222222222222",
    capability: "cancel_service_request",
    now: NOW,
  });
  assert.deepEqual(result, {
    kind: "forbidden",
    capability: "cancel_service_request",
  });
});

test("authorization requires the current server-authoritative consent version", () => {
  const current = authorizeAgentDelegation({
    delegation: record(),
    agentClientId: "22222222-2222-4222-8222-222222222222",
    capability: "create_service_request",
    now: NOW,
  });
  assert.equal(current.kind, "authorized");

  for (const version of ["1.0", "agent-delegation-v2", "unknown", "", "   "]) {
    const result = authorizeAgentDelegation({
      delegation: record({ consent_version: version }),
      agentClientId: "22222222-2222-4222-8222-222222222222",
      capability: "create_service_request",
      now: NOW,
    });
    assert.deepEqual(result, {
      kind: "invalid",
      reason: "invalid_consent_version",
    });
  }
});

test("provider-side lead capabilities are not user-delegatable", () => {
  assert.equal(isUserDelegatableCapability("create_service_request"), true);
  assert.equal(isUserDelegatableCapability("express_interest"), false);
  assert.equal(isUserDelegatableCapability("decline_lead"), false);
});
