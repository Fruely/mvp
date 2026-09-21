import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { register } from "node:module";
import { join } from "node:path";
import test from "node:test";
import { generateAgentCredential, parseAgentCredential } from "../agentAuth/credentials.ts";
import { authenticateAgentCredentialRecord } from "../agentAuth/policy.ts";
import {
  createMockProvisioningClient,
  provisioningHarness,
  resetProvisioningHarness,
} from "./testHarness.mjs";

register(new URL("./adminRoutes.hooks.mjs", import.meta.url).href);

const {
  CREDENTIAL_ISSUE_RETRY_LIMIT,
  createAgentClient,
  disableAgentClient,
  issueAgentCredential,
  listAgentCredentials,
  revokeAgentCredential,
} = await import("./service.ts");

const PEPPER = "test-pepper-that-is-definitely-longer-than-32-characters";
const NOW = new Date("2026-09-21T18:00:00.000Z");
const FUTURE_ISO = "2026-12-01T00:00:00.000Z";
const OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SPECIALIST_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function supabase() {
  return createMockProvisioningClient();
}

function deps(overrides = {}) {
  return {
    readPepper: () => PEPPER,
    now: () => NOW,
    ...overrides,
  };
}

function consumerBody(overrides = {}) {
  return {
    name: "Example consumer agent",
    client_type: "consumer_agent",
    provider: "example",
    scopes: ["requests:create"],
    ...overrides,
  };
}

test.beforeEach(() => {
  resetProvisioningHarness();
});

test("admin creates consumer_agent without issuing a credential", async () => {
  const result = await createAgentClient(supabase(), consumerBody());
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") return;
  assert.equal(result.value.client_type, "consumer_agent");
  assert.equal(result.value.status, "active");
  assert.deepEqual(result.value.scopes, ["requests:create"]);
  assert.equal(result.value.owner_user_id, null);
  assert.equal(result.value.specialist_id, null);
  assert.equal(provisioningHarness.credentials.length, 0);
  assert.equal(provisioningHarness.clients.length, 1);
});

test("admin creates business_agent with explicit scopes only", async () => {
  const result = await createAgentClient(supabase(), {
    name: "Example business agent",
    client_type: "business_agent",
    scopes: ["requests:create", "requests:read"],
    owner_user_id: OWNER_ID,
    specialist_id: SPECIALIST_ID,
  });
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") return;
  assert.equal(result.value.client_type, "business_agent");
  assert.deepEqual(result.value.scopes, ["requests:create", "requests:read"]);
  assert.equal(result.value.owner_user_id, OWNER_ID);
  assert.equal(result.value.specialist_id, SPECIALIST_ID);
  assert.equal(provisioningHarness.credentials.length, 0);
});

test("unknown client_type is rejected", async () => {
  const result = await createAgentClient(supabase(), consumerBody({
    client_type: "root_agent",
  }));
  assert.deepEqual(result, {
    kind: "validation_error",
    error: "unknown client_type",
    status: 400,
  });
  assert.equal(provisioningHarness.clients.length, 0);
});

test("unknown scope is rejected", async () => {
  const result = await createAgentClient(supabase(), consumerBody({
    scopes: ["requests:create", "admin:all"],
  }));
  assert.deepEqual(result, {
    kind: "validation_error",
    error: "unknown scope",
    status: 400,
  });
});

test("duplicate scopes are normalized and no implicit scopes are added", async () => {
  const result = await createAgentClient(supabase(), consumerBody({
    scopes: ["requests:create", " requests:create ", "requests:create"],
  }));
  assert.equal(result.kind, "ok");
  if (result.kind !== "ok") return;
  assert.deepEqual(result.value.scopes, ["requests:create"]);
});

test("invalid owner or specialist UUID is rejected", async () => {
  const owner = await createAgentClient(supabase(), consumerBody({
    owner_user_id: "not-a-uuid",
  }));
  assert.equal(owner.kind, "validation_error");
  assert.match(String("error" in owner ? owner.error : ""), /owner_user_id/);

  const specialist = await createAgentClient(supabase(), consumerBody({
    specialist_id: "1234",
  }));
  assert.equal(specialist.kind, "validation_error");
  assert.match(String("error" in specialist ? specialist.error : ""), /specialist_id/);
});

test("issues a credential for an active client and stores hash not raw", async () => {
  const created = await createAgentClient(supabase(), consumerBody());
  assert.equal(created.kind, "ok");
  if (created.kind !== "ok") return;

  const issued = await issueAgentCredential(
    supabase(),
    created.value.id,
    {},
    deps(),
  );
  assert.equal(issued.kind, "ok");
  if (issued.kind !== "ok") return;

  const parsed = parseAgentCredential(issued.value.raw_credential);
  assert.ok(parsed);
  assert.equal(parsed.keyPrefix, issued.value.key_prefix);
  assert.match(issued.value.raw_credential, /^frly_agent_[a-f0-9]{12}_/);

  const stored = provisioningHarness.credentials[0];
  assert.ok(stored);
  assert.equal(stored.key_prefix, issued.value.key_prefix);
  assert.ok(stored.credential_hash);
  assert.notEqual(stored.credential_hash, issued.value.raw_credential);
  assert.doesNotMatch(JSON.stringify(stored), new RegExp(issued.value.raw_credential));
  assert.equal(stored.status, "active");
  assert.equal(provisioningHarness.lastCredentialInsert.raw_credential, undefined);
  assert.equal(provisioningHarness.lastCredentialInsert.raw, undefined);
  assert.deepEqual(Object.keys(provisioningHarness.lastCredentialInsert).sort(), [
    "agent_client_id",
    "credential_hash",
    "expires_at",
    "key_prefix",
    "status",
  ]);
});

test("missing pepper fails closed before insert", async () => {
  const created = await createAgentClient(supabase(), consumerBody());
  assert.equal(created.kind, "ok");
  if (created.kind !== "ok") return;

  const issued = await issueAgentCredential(
    supabase(),
    created.value.id,
    {},
    deps({ readPepper: () => null }),
  );
  assert.deepEqual(issued, {
    kind: "unavailable",
    error: "credential issuance unavailable",
    status: 503,
  });
  assert.equal(provisioningHarness.credentials.length, 0);
});

test("disabled or missing client cannot be issued a credential", async () => {
  const created = await createAgentClient(supabase(), consumerBody());
  assert.equal(created.kind, "ok");
  if (created.kind !== "ok") return;
  await disableAgentClient(supabase(), created.value.id, {}, deps());

  const disabled = await issueAgentCredential(
    supabase(),
    created.value.id,
    {},
    deps(),
  );
  assert.deepEqual(disabled, {
    kind: "conflict",
    error: "agent_client_disabled",
    status: 409,
  });

  const missing = await issueAgentCredential(
    supabase(),
    "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    {},
    deps(),
  );
  assert.deepEqual(missing, {
    kind: "not_found",
    error: "agent_client not found",
    status: 404,
  });
});

test("optional future expiry is accepted; past and invalid expiry are rejected", async () => {
  const created = await createAgentClient(supabase(), consumerBody());
  assert.equal(created.kind, "ok");
  if (created.kind !== "ok") return;

  const future = await issueAgentCredential(
    supabase(),
    created.value.id,
    { expires_at: FUTURE_ISO },
    deps(),
  );
  assert.equal(future.kind, "ok");
  if (future.kind === "ok") {
    assert.equal(future.value.expires_at, FUTURE_ISO);
  }

  const offset = await issueAgentCredential(
    supabase(),
    created.value.id,
    { expires_at: "2026-12-01T01:00:00+01:00" },
    deps(),
  );
  assert.equal(offset.kind, "ok");
  if (offset.kind === "ok") {
    assert.equal(offset.value.expires_at, "2026-12-01T00:00:00.000Z");
  }

  const past = await issueAgentCredential(
    supabase(),
    created.value.id,
    { expires_at: "2026-01-01T00:00:00.000Z" },
    deps(),
  );
  assert.equal(past.kind, "validation_error");
  assert.match(String("error" in past ? past.error : ""), /future/);

  const invalid = await issueAgentCredential(
    supabase(),
    created.value.id,
    { expires_at: "next-week" },
    deps(),
  );
  assert.equal(invalid.kind, "validation_error");

  const dateOnly = await issueAgentCredential(
    supabase(),
    created.value.id,
    { expires_at: "2026-12-01" },
    deps(),
  );
  assert.equal(dateOnly.kind, "validation_error");

  const naive = await issueAgentCredential(
    supabase(),
    created.value.id,
    { expires_at: "2026-12-01T00:00:00" },
    deps(),
  );
  assert.equal(naive.kind, "validation_error");
});

test("unique prefix/hash collisions retry a bounded number of times", async () => {
  const created = await createAgentClient(supabase(), consumerBody());
  assert.equal(created.kind, "ok");
  if (created.kind !== "ok") return;

  let calls = 0;
  provisioningHarness.credentialInsertFailuresRemaining = 2;
  const issued = await issueAgentCredential(
    supabase(),
    created.value.id,
    {},
    deps({
      generateCredential: (pepper) => {
        calls += 1;
        return generateAgentCredential(pepper);
      },
    }),
  );
  assert.equal(issued.kind, "ok");
  assert.equal(calls, 3);
  assert.equal(provisioningHarness.credentials.length, 1);

  let exhaustedCalls = 0;
  provisioningHarness.credentialInsertFailuresRemaining = CREDENTIAL_ISSUE_RETRY_LIMIT;
  const exhausted = await issueAgentCredential(
    supabase(),
    created.value.id,
    {},
    deps({
      generateCredential: (pepper) => {
        exhaustedCalls += 1;
        return generateAgentCredential(pepper);
      },
    }),
  );
  assert.equal(exhausted.kind, "error");
  assert.equal(exhaustedCalls, CREDENTIAL_ISSUE_RETRY_LIMIT);
});

test("revoke is idempotent, populates revoked_at, and never deletes", async () => {
  const created = await createAgentClient(supabase(), consumerBody());
  assert.equal(created.kind, "ok");
  if (created.kind !== "ok") return;
  const issued = await issueAgentCredential(
    supabase(),
    created.value.id,
    {},
    deps(),
  );
  assert.equal(issued.kind, "ok");
  if (issued.kind !== "ok") return;

  const first = await revokeAgentCredential(
    supabase(),
    issued.value.credential_id,
    {},
    deps(),
  );
  assert.equal(first.kind, "ok");
  if (first.kind !== "ok") return;
  assert.equal(first.value.status, "revoked");
  assert.equal(first.value.revoked_at, NOW.toISOString());

  const second = await revokeAgentCredential(
    supabase(),
    issued.value.credential_id,
    {},
    deps(),
  );
  assert.deepEqual(second, first);
  assert.equal(provisioningHarness.credentials.length, 1);
  assert.equal(provisioningHarness.credentials[0].status, "revoked");
  assert.equal(provisioningHarness.deleteCalls.length, 0);
  assert.equal(
    provisioningHarness.operations.some((op) => op.op === "delete"),
    false,
  );
});

test("disable is idempotent and leaves historical credentials intact", async () => {
  const created = await createAgentClient(supabase(), consumerBody());
  assert.equal(created.kind, "ok");
  if (created.kind !== "ok") return;
  const issued = await issueAgentCredential(
    supabase(),
    created.value.id,
    {},
    deps(),
  );
  assert.equal(issued.kind, "ok");
  if (issued.kind !== "ok") return;

  const first = await disableAgentClient(supabase(), created.value.id, {}, deps());
  assert.equal(first.kind, "ok");
  if (first.kind !== "ok") return;
  assert.equal(first.value.status, "disabled");

  const second = await disableAgentClient(supabase(), created.value.id, {}, deps());
  assert.deepEqual(second, first);

  const stored = provisioningHarness.credentials[0];
  assert.equal(stored.status, "active");
  assert.equal(stored.revoked_at, null);

  const decision = authenticateAgentCredentialRecord({
    rawCredential: issued.value.raw_credential,
    pepper: PEPPER,
    credential: {
      id: stored.id,
      agent_client_id: stored.agent_client_id,
      key_prefix: stored.key_prefix,
      credential_hash: stored.credential_hash,
      status: stored.status,
      expires_at: stored.expires_at,
      revoked_at: stored.revoked_at,
    },
    client: {
      id: provisioningHarness.clients[0].id,
      name: provisioningHarness.clients[0].name,
      client_type: provisioningHarness.clients[0].client_type,
      provider: provisioningHarness.clients[0].provider,
      status: provisioningHarness.clients[0].status,
      scopes: provisioningHarness.clients[0].scopes,
      specialist_id: provisioningHarness.clients[0].specialist_id,
      owner_user_id: provisioningHarness.clients[0].owner_user_id,
    },
    now: NOW,
  });
  assert.deepEqual(decision, { kind: "invalid" });
});

test("lists only safe credential metadata for one client, including revoked rows", async () => {
  const first = await createAgentClient(supabase(), consumerBody({ name: "First" }));
  const second = await createAgentClient(supabase(), consumerBody({
    name: "Second",
    client_type: "business_agent",
  }));
  assert.equal(first.kind, "ok");
  assert.equal(second.kind, "ok");
  if (first.kind !== "ok" || second.kind !== "ok") return;

  const older = await issueAgentCredential(supabase(), first.value.id, {}, deps());
  provisioningHarness.nowIso = "2026-09-21T19:00:00.000Z";
  const newer = await issueAgentCredential(supabase(), first.value.id, {}, deps());
  const other = await issueAgentCredential(supabase(), second.value.id, {}, deps());
  assert.equal(older.kind, "ok");
  assert.equal(newer.kind, "ok");
  assert.equal(other.kind, "ok");
  if (older.kind !== "ok" || newer.kind !== "ok") return;

  await revokeAgentCredential(supabase(), older.value.credential_id, {}, deps());

  const listed = await listAgentCredentials(supabase(), first.value.id);
  assert.equal(listed.kind, "ok");
  if (listed.kind !== "ok") return;
  assert.equal(listed.value.length, 2);
  assert.deepEqual(
    listed.value.map((row) => row.credential_id),
    [newer.value.credential_id, older.value.credential_id],
  );
  assert.equal(listed.value[0].status, "active");
  assert.equal(listed.value[0].key_prefix, newer.value.key_prefix);
  assert.equal(listed.value[0].last_used_at, null);
  assert.equal(listed.value[1].status, "revoked");
  assert.equal(listed.value[1].revoked_at, NOW.toISOString());
  assert.equal(
    listed.value.some((row) => row.agent_client_id !== first.value.id),
    false,
  );
  assert.doesNotMatch(JSON.stringify(listed.value), /credential_hash|raw_credential|pepper/i);
});

test("unknown JSON fields are rejected and status/metadata cannot be planted", async () => {
  const planted = await createAgentClient(supabase(), {
    ...consumerBody(),
    status: "disabled",
    metadata: { note: "nope" },
  });
  assert.deepEqual(planted, {
    kind: "validation_error",
    error: "unknown fields are not allowed",
    status: 400,
  });

  const extra = await issueAgentCredential(
    supabase(),
    "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    { raw_credential: "frly_agent_deadbeefcafe_shouldneverbeaccepted12" },
    deps(),
  );
  assert.equal(extra.kind, "validation_error");
});

test("provisioning sources never delete, log raw credentials, or expose pepper", () => {
  const directory = join(process.cwd(), "lib/agentProvisioning");
  const sources = readdirSync(directory)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => ({
      name,
      source: readFileSync(join(directory, name), "utf8"),
    }));

  for (const file of sources) {
    assert.doesNotMatch(file.source, /\.delete\s*\(/, file.name);
    assert.doesNotMatch(file.source, /console\.(log|info|debug|warn)/, file.name);
    assert.doesNotMatch(file.source, /NEXT_PUBLIC_/, file.name);
    assert.doesNotMatch(file.source, /SUPABASE_SERVICE_ROLE_KEY/, file.name);
    assert.doesNotMatch(file.source, /recordAgentApiAudit|agent_api_audit_events/, file.name);
  }
});
