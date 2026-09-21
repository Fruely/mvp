import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { register } from "node:module";
import { join } from "node:path";
import test from "node:test";
import { authorizeAgentDelegation } from "./policy.ts";
import {
  createMockConsentClient,
  consentHarness,
  resetConsentHarness,
  seedClient,
  seedDelegation,
} from "./consentHarness.mjs";
import { AGENT_USER_CONSENT_VERSION } from "./consent.ts";

register(new URL("./consentRoutes.hooks.mjs", import.meta.url).href);

const {
  createUserDelegation,
  listUserDelegations,
  previewConsentableAgent,
  revokeUserDelegation,
} = await import("./consentService.ts");

const USER_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_ID = "55555555-5555-4555-8555-555555555555";
const NOW = new Date("2026-09-21T20:00:00.000Z");

function supabase() {
  return createMockConsentClient();
}

function deps() {
  return { now: () => NOW };
}

function createBody(agentClientId, overrides = {}) {
  return {
    agent_client_id: agentClientId,
    allowed_capabilities: ["create_service_request"],
    consent_version: AGENT_USER_CONSENT_VERSION,
    ...overrides,
  };
}

test.beforeEach(() => {
  resetConsentHarness();
});

test("authenticated user can preview and create a business_agent delegation", async () => {
  const client = seedClient();
  const preview = await previewConsentableAgent(supabase(), USER_ID, client.id);
  assert.equal(preview.kind, "ok");
  if (preview.kind !== "ok") return;
  assert.equal(preview.value.consent_version, AGENT_USER_CONSENT_VERSION);
  assert.deepEqual(
    preview.value.delegatable_capabilities.map((item) => item.id),
    ["create_service_request"],
  );
  assert.equal(preview.value.owner_user_id, undefined);
  assert.equal(preview.value.scopes, undefined);

  const created = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id),
    deps(),
  );
  assert.equal(created.kind, "ok");
  if (created.kind !== "ok") return;
  assert.equal(created.value.status, "active");
  assert.deepEqual(created.value.allowed_capabilities, ["create_service_request"]);
  assert.equal(consentHarness.delegations[0].user_id, USER_ID);
  assert.equal(consentHarness.delegations[0].purpose, null);
});

test("created delegation is accepted by authorizeAgentDelegation for the same agent only", async () => {
  const client = seedClient();
  const other = seedClient({ name: "Other" });
  const created = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id),
    deps(),
  );
  assert.equal(created.kind, "ok");
  if (created.kind !== "ok") return;
  const row = consentHarness.delegations[0];

  const accepted = authorizeAgentDelegation({
    delegation: row,
    agentClientId: client.id,
    capability: "create_service_request",
    now: NOW,
  });
  assert.equal(accepted.kind, "authorized");
  if (accepted.kind === "authorized") {
    assert.equal(accepted.delegation.userId, USER_ID);
  }

  const mismatch = authorizeAgentDelegation({
    delegation: row,
    agentClientId: other.id,
    capability: "create_service_request",
    now: NOW,
  });
  assert.deepEqual(mismatch, { kind: "invalid", reason: "client_mismatch" });
});

test("owned consumer_agent may be consented; unbound or other-owned may not", async () => {
  const owned = seedClient({
    name: "Mine",
    client_type: "consumer_agent",
    owner_user_id: USER_ID,
  });
  const other = seedClient({
    name: "Theirs",
    client_type: "consumer_agent",
    owner_user_id: OTHER_ID,
  });
  const unbound = seedClient({
    name: "Unbound",
    client_type: "consumer_agent",
    owner_user_id: null,
  });

  const ok = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(owned.id),
    deps(),
  );
  assert.equal(ok.kind, "ok");

  const foreign = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(other.id),
    deps(),
  );
  assert.equal(foreign.kind, "not_found");

  const open = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(unbound.id),
    deps(),
  );
  assert.equal(open.kind, "not_found");
});

test("provider, internal and disabled agents are not consentable", async () => {
  const provider = seedClient({ client_type: "provider_agent" });
  const internal = seedClient({ client_type: "internal_agent" });
  const disabled = seedClient({ status: "disabled" });

  for (const client of [provider, internal, disabled]) {
    const preview = await previewConsentableAgent(supabase(), USER_ID, client.id);
    assert.equal(preview.kind, "not_found", client.client_type);
    const created = await createUserDelegation(
      supabase(),
      USER_ID,
      createBody(client.id),
      deps(),
    );
    assert.equal(created.kind, "not_found");
  }
});

test("stale consent version, future-only capabilities and missing scope are rejected", async () => {
  const client = seedClient();
  const stale = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id, { consent_version: "1.0" }),
    deps(),
  );
  assert.deepEqual(stale, {
    kind: "conflict",
    error: "consent_version_mismatch",
    status: 409,
  });

  const future = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id, {
      allowed_capabilities: ["get_service_request"],
    }),
    deps(),
  );
  assert.equal(future.kind, "validation_error");
  assert.equal("error" in future ? future.error : "", "capability_not_enabled");

  const unknown = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id, { allowed_capabilities: ["admin_everything"] }),
    deps(),
  );
  assert.equal(unknown.kind, "validation_error");

  const noscope = seedClient({
    name: "No scope",
    scopes: ["requests:read"],
  });
  const missing = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(noscope.id),
    deps(),
  );
  assert.deepEqual(missing, {
    kind: "validation_error",
    error: "agent_missing_required_scope",
    status: 400,
  });
});

test("duplicate capabilities are normalized and user_id cannot be planted", async () => {
  const client = seedClient();
  const created = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id, {
      allowed_capabilities: [
        "create_service_request",
        "create_service_request",
      ],
    }),
    deps(),
  );
  assert.equal(created.kind, "ok");
  if (created.kind === "ok") {
    assert.deepEqual(created.value.allowed_capabilities, ["create_service_request"]);
  }

  const planted = await createUserDelegation(
    supabase(),
    USER_ID,
    {
      ...createBody(client.id),
      user_id: OTHER_ID,
    },
    deps(),
  );
  assert.equal(planted.kind, "validation_error");
  assert.equal(consentHarness.delegations.length, 1);
  assert.equal(consentHarness.delegations[0].user_id, USER_ID);
});

test("strict future RFC3339 expiry is accepted; loose and past values are rejected", async () => {
  const client = seedClient();
  const future = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id, { expires_at: "2026-12-01T00:00:00Z" }),
    deps(),
  );
  assert.equal(future.kind, "ok");
  if (future.kind === "ok") {
    assert.equal(future.value.expires_at, "2026-12-01T00:00:00.000Z");
  }

  const dateOnly = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id, { expires_at: "2026-12-01" }),
    deps(),
  );
  assert.equal(dateOnly.kind, "validation_error");

  const past = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id, { expires_at: "2026-01-01T00:00:00.000Z" }),
    deps(),
  );
  assert.equal(past.kind, "validation_error");
});

test("list returns only the caller's rows with effective expired status, newest first", async () => {
  const client = seedClient();
  consentHarness.nowIso = "2026-09-21T18:00:00.000Z";
  const first = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id, { expires_at: "2026-09-21T19:00:00.000Z" }),
    { now: () => new Date("2026-09-21T18:00:00.000Z") },
  );
  consentHarness.nowIso = "2026-09-21T20:05:00.000Z";
  const second = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id),
    deps(),
  );
  await createUserDelegation(
    supabase(),
    OTHER_ID,
    createBody(client.id),
    deps(),
  );
  assert.equal(first.kind, "ok");
  assert.equal(second.kind, "ok");

  const listed = await listUserDelegations(supabase(), USER_ID, deps());
  assert.equal(listed.kind, "ok");
  if (listed.kind !== "ok") return;
  assert.equal(listed.value.length, 2);
  assert.equal(listed.value[0].delegation_id, second.value.delegation_id);
  assert.equal(listed.value[0].status, "active");
  assert.equal(listed.value[1].status, "expired");
  assert.equal(
    listed.value.some((row) => JSON.stringify(row).includes(OTHER_ID)),
    false,
  );
  assert.doesNotMatch(
    JSON.stringify(listed.value),
    /credential_hash|raw_credential|key_prefix|pepper|owner_user_id/,
  );
});

test("second create for the same user and agent is rejected while the first is effectively active", async () => {
  const client = seedClient();
  const first = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id),
    deps(),
  );
  const second = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id),
    deps(),
  );
  assert.equal(first.kind, "ok");
  assert.deepEqual(second, {
    kind: "conflict",
    error: "active_delegation_exists",
    status: 409,
  });
  assert.equal(consentHarness.delegations.length, 1);
});

test("another user may independently consent to the same business_agent", async () => {
  const client = seedClient();
  const first = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id),
    deps(),
  );
  const other = await createUserDelegation(
    supabase(),
    OTHER_ID,
    createBody(client.id),
    deps(),
  );
  assert.equal(first.kind, "ok");
  assert.equal(other.kind, "ok");
  assert.equal(consentHarness.delegations.length, 2);
  assert.equal(consentHarness.delegations[0].user_id, USER_ID);
  assert.equal(consentHarness.delegations[1].user_id, OTHER_ID);
});

test("same user may consent to another agent", async () => {
  const firstClient = seedClient();
  const secondClient = seedClient({ name: "Second agent" });
  const first = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(firstClient.id),
    deps(),
  );
  const second = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(secondClient.id),
    deps(),
  );
  assert.equal(first.kind, "ok");
  assert.equal(second.kind, "ok");
  assert.equal(consentHarness.delegations.length, 2);
});

test("expired previous delegation does not block a new grant", async () => {
  const client = seedClient();
  consentHarness.nowIso = "2026-09-21T18:00:00.000Z";
  const expired = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id, { expires_at: "2026-09-21T19:00:00.000Z" }),
    { now: () => new Date("2026-09-21T18:00:00.000Z") },
  );
  consentHarness.nowIso = "2026-09-21T20:05:00.000Z";
  const created = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id),
    deps(),
  );
  assert.equal(expired.kind, "ok");
  assert.equal(created.kind, "ok");
  assert.equal(consentHarness.delegations.length, 2);
  assert.equal(consentHarness.delegations[0].status, "active");
  assert.equal(consentHarness.delegations[1].status, "active");
});

test("revoke of either duplicate active grant revokes all for that user and agent", async () => {
  const client = seedClient();
  const otherAgent = seedClient({ name: "Other agent" });
  const first = seedDelegation({
    agent_client_id: client.id,
    user_id: USER_ID,
  });
  const second = seedDelegation({
    agent_client_id: client.id,
    user_id: USER_ID,
  });
  const otherUser = seedDelegation({
    agent_client_id: client.id,
    user_id: OTHER_ID,
  });
  const otherGrant = seedDelegation({
    agent_client_id: otherAgent.id,
    user_id: USER_ID,
  });

  const revoked = await revokeUserDelegation(
    supabase(),
    USER_ID,
    second.id,
    {},
    deps(),
  );
  assert.equal(revoked.kind, "ok");
  if (revoked.kind === "ok") {
    assert.equal(revoked.value.delegation_id, second.id);
    assert.equal(revoked.value.status, "revoked");
  }

  const firstRow = consentHarness.delegations.find((row) => row.id === first.id);
  const secondRow = consentHarness.delegations.find((row) => row.id === second.id);
  const otherUserRow = consentHarness.delegations.find(
    (row) => row.id === otherUser.id,
  );
  const otherGrantRow = consentHarness.delegations.find(
    (row) => row.id === otherGrant.id,
  );
  assert.equal(firstRow?.status, "revoked");
  assert.equal(secondRow?.status, "revoked");
  assert.equal(otherUserRow?.status, "active");
  assert.equal(otherGrantRow?.status, "active");
  assert.equal(consentHarness.deleteCalls.length, 0);

  for (const row of [firstRow, secondRow]) {
    const decision = authorizeAgentDelegation({
      delegation: row,
      agentClientId: client.id,
      capability: "create_service_request",
      now: NOW,
    });
    assert.deepEqual(decision, { kind: "invalid", reason: "inactive" });
  }

  const otherDecision = authorizeAgentDelegation({
    delegation: otherUserRow,
    agentClientId: client.id,
    capability: "create_service_request",
    now: NOW,
  });
  assert.equal(otherDecision.kind, "authorized");
});

test("list fails closed when referenced agent_client metadata is missing", async () => {
  seedDelegation({
    agent_client_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    user_id: USER_ID,
  });
  const listed = await listUserDelegations(supabase(), USER_ID, deps());
  assert.deepEqual(listed, {
    kind: "error",
    error: "server_error",
    status: 500,
  });
});

test("revoke is owner-scoped, idempotent, and rejected by authorization policy", async () => {
  const client = seedClient();
  const created = await createUserDelegation(
    supabase(),
    USER_ID,
    createBody(client.id),
    deps(),
  );
  assert.equal(created.kind, "ok");
  if (created.kind !== "ok") return;

  const first = await revokeUserDelegation(
    supabase(),
    USER_ID,
    created.value.delegation_id,
    {},
    deps(),
  );
  const second = await revokeUserDelegation(
    supabase(),
    USER_ID,
    created.value.delegation_id,
    {},
    deps(),
  );
  assert.equal(first.kind, "ok");
  assert.deepEqual(second, first);
  assert.equal(consentHarness.delegations[0].status, "revoked");
  assert.equal(consentHarness.deleteCalls.length, 0);

  const foreign = await revokeUserDelegation(
    supabase(),
    OTHER_ID,
    created.value.delegation_id,
    {},
    deps(),
  );
  assert.equal(foreign.kind, "not_found");

  const decision = authorizeAgentDelegation({
    delegation: consentHarness.delegations[0],
    agentClientId: client.id,
    capability: "create_service_request",
    now: NOW,
  });
  assert.deepEqual(decision, { kind: "invalid", reason: "inactive" });
});

test("consent sources never delete, log tokens, or expose secrets", () => {
  const directory = join(process.cwd(), "lib/agentDelegation");
  const sources = readdirSync(directory)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => ({
      name,
      source: readFileSync(join(directory, name), "utf8"),
    }));

  for (const file of sources) {
    assert.doesNotMatch(file.source, /\.delete\s*\(/, file.name);
    assert.doesNotMatch(file.source, /requireAdminToken|ADMIN_API_TOKEN/, file.name);
    assert.doesNotMatch(file.source, /recordAgentApiAudit/, file.name);
    assert.doesNotMatch(file.source, /console\.(log|info|debug)/, file.name);
    assert.doesNotMatch(file.source, /SUPABASE_SERVICE_ROLE_KEY/, file.name);
    assert.doesNotMatch(file.source, /NEXT_PUBLIC_/, file.name);
  }
});
