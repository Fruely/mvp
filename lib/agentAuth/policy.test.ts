import assert from "node:assert/strict";
import test from "node:test";
import { generateAgentCredential } from "./credentials.ts";
import {
  authenticateAgentCredentialRecord,
  missingAgentScopes,
  type AgentClientRecord,
  type AgentCredentialRecord,
} from "./policy.ts";

const PEPPER = "test-pepper-that-is-definitely-longer-than-32-characters";
const NOW = new Date("2026-09-20T19:00:00.000Z");

function fixture() {
  const generated = generateAgentCredential(PEPPER);

  const credential: AgentCredentialRecord = {
    id: "cred-1",
    agent_client_id: "client-1",
    key_prefix: generated.keyPrefix,
    credential_hash: generated.credentialHash,
    status: "active",
    expires_at: "2027-09-20T19:00:00.000Z",
    revoked_at: null,
  };

  const client: AgentClientRecord = {
    id: "client-1",
    name: "Example consumer agent",
    client_type: "consumer_agent",
    provider: "example",
    status: "active",
    scopes: ["requests:create", "requests:read", "requests:read"],
    specialist_id: null,
    owner_user_id: "user-1",
  };

  return { generated, credential, client };
}

test("active credential resolves a normalized scoped agent identity", () => {
  const { generated, credential, client } = fixture();

  const decision = authenticateAgentCredentialRecord({
    rawCredential: generated.raw,
    pepper: PEPPER,
    credential,
    client,
    requiredScopes: ["requests:create"],
    now: NOW,
  });

  assert.deepEqual(decision, {
    kind: "authenticated",
    identity: {
      clientId: "client-1",
      credentialId: "cred-1",
      name: "Example consumer agent",
      clientType: "consumer_agent",
      provider: "example",
      scopes: ["requests:create", "requests:read"],
      specialistId: null,
      ownerUserId: "user-1",
    },
  });
});

test("scope resolution is exact and reports every missing scope", () => {
  assert.deepEqual(
    missingAgentScopes(
      ["requests:read", " requests:create ", "requests:read"],
      ["requests:create", "matches:read", "leads:discover"],
    ),
    ["matches:read", "leads:discover"],
  );

  const { generated, credential, client } = fixture();
  const decision = authenticateAgentCredentialRecord({
    rawCredential: generated.raw,
    pepper: PEPPER,
    credential,
    client,
    requiredScopes: ["requests:create", "matches:read"],
    now: NOW,
  });

  assert.deepEqual(decision, {
    kind: "forbidden",
    missingScopes: ["matches:read"],
  });
});

test("revoked, disabled, expired and mismatched credentials fail closed", () => {
  const base = fixture();

  const revoked = authenticateAgentCredentialRecord({
    rawCredential: base.generated.raw,
    pepper: PEPPER,
    credential: {
      ...base.credential,
      status: "revoked",
      revoked_at: "2026-09-20T18:00:00.000Z",
    },
    client: base.client,
    now: NOW,
  });
  assert.deepEqual(revoked, { kind: "invalid" });

  const disabled = authenticateAgentCredentialRecord({
    rawCredential: base.generated.raw,
    pepper: PEPPER,
    credential: base.credential,
    client: { ...base.client, status: "disabled" },
    now: NOW,
  });
  assert.deepEqual(disabled, { kind: "invalid" });

  const expired = authenticateAgentCredentialRecord({
    rawCredential: base.generated.raw,
    pepper: PEPPER,
    credential: {
      ...base.credential,
      expires_at: "2026-09-20T18:59:59.000Z",
    },
    client: base.client,
    now: NOW,
  });
  assert.deepEqual(expired, { kind: "invalid" });

  const mismatchedClient = authenticateAgentCredentialRecord({
    rawCredential: base.generated.raw,
    pepper: PEPPER,
    credential: { ...base.credential, agent_client_id: "other-client" },
    client: base.client,
    now: NOW,
  });
  assert.deepEqual(mismatchedClient, { kind: "invalid" });

  const wrongSecret = authenticateAgentCredentialRecord({
    rawCredential: generateAgentCredential(PEPPER).raw,
    pepper: PEPPER,
    credential: base.credential,
    client: base.client,
    now: NOW,
  });
  assert.deepEqual(wrongSecret, { kind: "invalid" });
});

test("invalid expiry and unknown client type fail closed", () => {
  const base = fixture();

  const invalidExpiry = authenticateAgentCredentialRecord({
    rawCredential: base.generated.raw,
    pepper: PEPPER,
    credential: {
      ...base.credential,
      expires_at: "not-a-date",
    },
    client: base.client,
    now: NOW,
  });
  assert.deepEqual(invalidExpiry, { kind: "invalid" });

  const unknownType = authenticateAgentCredentialRecord({
    rawCredential: base.generated.raw,
    pepper: PEPPER,
    credential: base.credential,
    client: {
      ...base.client,
      client_type: "root_agent" as AgentClientRecord["client_type"],
    },
    now: NOW,
  });
  assert.deepEqual(unknownType, { kind: "invalid" });
});

test("unknown scopes fail closed instead of being treated as grants", () => {
  const base = fixture();
  const decision = authenticateAgentCredentialRecord({
    rawCredential: base.generated.raw,
    pepper: PEPPER,
    credential: base.credential,
    client: {
      ...base.client,
      scopes: ["requests:create", "admin:all"],
    },
    requiredScopes: ["requests:create"],
    now: NOW,
  });
  assert.deepEqual(decision, { kind: "invalid" });
});

test("missing records are invalid and never treated as anonymous success", () => {
  const base = fixture();

  assert.deepEqual(
    authenticateAgentCredentialRecord({
      rawCredential: base.generated.raw,
      pepper: PEPPER,
      credential: null,
      client: base.client,
      now: NOW,
    }),
    { kind: "invalid" },
  );

  assert.deepEqual(
    authenticateAgentCredentialRecord({
      rawCredential: base.generated.raw,
      pepper: PEPPER,
      credential: base.credential,
      client: null,
      now: NOW,
    }),
    { kind: "invalid" },
  );
});
