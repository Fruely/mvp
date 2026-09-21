import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { join } from "node:path";
import test from "node:test";
import { buildFreulyA2AAgentCard } from "../agentCore/adapters/a2a.ts";
import { buildFreulyArdManifest } from "../agentCore/adapters/ard.ts";
import { buildFreulyMcpToolCatalog } from "../agentCore/adapters/mcp.ts";
import { buildFreulyReadOnlyOpenApiDocument } from "../agentCore/adapters/openapi.ts";
import { harness, resetHarness } from "../serviceRequests/serviceRequests.harness.mjs";
import { deriveAgentCreateServiceRequestStorageKey } from "./idempotencyKey.ts";
import {
  agentHarness,
  authorizedBusiness,
  authorizedConsumer,
  authorizedDelegation,
  resetAgentHarness,
} from "./testHarness.mjs";

register(new URL("./createServiceRequest.route.hooks.mjs", import.meta.url).href);

const { POST: agentCreatePost } = await import(
  new URL("../../app/api/v1/agent/service-requests/route.ts", import.meta.url)
    .href
);

const VALID_BODY = {
  category: "Бухгалтерия",
  language: "ru",
  work_format: "online",
  request_text: "Need bookkeeping help",
  user_contact: {
    name: "Anna",
    email: "anna@example.com",
  },
};

const IDEMPOTENCY_KEY = "agent:create:abc12345";
const SECRET_EMAIL = "anna@example.com";
const SECRET_PHONE = "+49123456789";
const RAW_CREDENTIAL = "frly_agent_deadbeefcafe_thisisnotarealcredentialvalue12";

function authorizeConsumer(delegationOverrides = {}) {
  agentHarness.auth = authorizedConsumer();
  agentHarness.delegation = authorizedDelegation(delegationOverrides);
}

function authorizeBusiness(delegationOverrides = {}) {
  agentHarness.auth = authorizedBusiness();
  agentHarness.delegation = authorizedDelegation({
    agentClientId: "client-business-1",
    userId: "user-owner-1",
    ...delegationOverrides,
  });
}

function agentRequest(options = {}) {
  const headers = new Headers();
  if (options.authorization !== null) {
    headers.set(
      "Authorization",
      options.authorization ?? `Bearer ${RAW_CREDENTIAL}`,
    );
  }
  if (options.delegationId !== null) {
    headers.set(
      "X-Freuly-Delegation-Id",
      options.delegationId ?? "11111111-1111-4111-8111-111111111111",
    );
  }
  if (options.idempotencyKey !== null) {
    headers.set(
      "Idempotency-Key",
      options.idempotencyKey ?? IDEMPOTENCY_KEY,
    );
  }
  if (options.contentType !== null) {
    headers.set("Content-Type", options.contentType ?? "application/json");
  }
  for (const [key, value] of Object.entries(options.headers ?? {})) {
    headers.set(key, value);
  }

  const init = {
    method: "POST",
    headers,
  };
  if (options.rawBody !== undefined) {
    init.body = options.rawBody;
  } else if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  } else {
    init.body = JSON.stringify(VALID_BODY);
  }

  return new Request("https://freuly.de/api/v1/agent/service-requests", init);
}

function auditBlob() {
  return JSON.stringify(agentHarness.auditEvents);
}

test.beforeEach(() => {
  resetHarness();
  resetAgentHarness();
});

test("no credential -> 401", async () => {
  agentHarness.auth = { kind: "absent" };
  const res = await agentCreatePost(agentRequest());
  const json = await res.json();
  assert.equal(res.status, 401);
  assert.equal(json.error, "unauthorized");
  assert.equal(harness.rows.length, 0);
});

test("invalid credential -> 401", async () => {
  agentHarness.auth = { kind: "invalid" };
  const res = await agentCreatePost(agentRequest());
  assert.equal(res.status, 401);
  assert.equal((await res.json()).error, "unauthorized");
});

test("missing requests:create -> 403", async () => {
  agentHarness.auth = { kind: "forbidden", missingScopes: ["requests:create"] };
  agentHarness.delegation = authorizedDelegation();
  const res = await agentCreatePost(agentRequest());
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, "forbidden");
  assert.equal(agentHarness.markUsedCalls.length, 0);
});

test("wrong client type -> 403", async () => {
  agentHarness.auth = authorizedConsumer({
    identity: { clientType: "provider_agent" },
  });
  agentHarness.delegation = authorizedDelegation();
  const res = await agentCreatePost(agentRequest());
  assert.equal(res.status, 403);
});

test("no delegation -> 403", async () => {
  agentHarness.auth = authorizedConsumer();
  agentHarness.delegation = { kind: "absent" };
  const res = await agentCreatePost(agentRequest());
  assert.equal(res.status, 403);
});

test("revoked or expired delegation -> 403", async () => {
  agentHarness.auth = authorizedConsumer();
  agentHarness.delegation = { kind: "invalid", reason: "inactive" };
  assert.equal((await agentCreatePost(agentRequest())).status, 403);

  agentHarness.delegation = { kind: "invalid", reason: "expired" };
  assert.equal((await agentCreatePost(agentRequest())).status, 403);
});

test("stale consent version -> 403", async () => {
  agentHarness.auth = authorizedConsumer();
  agentHarness.delegation = {
    kind: "invalid",
    reason: "invalid_consent_version",
  };
  const res = await agentCreatePost(agentRequest());
  assert.equal(res.status, 403);
  assert.equal(harness.rows.length, 0);
});

test("capability absent from delegation -> 403", async () => {
  agentHarness.auth = authorizedConsumer();
  agentHarness.delegation = { kind: "forbidden", capability: "create_service_request" };
  const res = await agentCreatePost(agentRequest());
  assert.equal(res.status, 403);
});

test("consumer owner mismatch -> 403", async () => {
  agentHarness.auth = authorizedConsumer();
  agentHarness.delegation = authorizedDelegation({ userId: "user-other-2" });
  const res = await agentCreatePost(agentRequest());
  assert.equal(res.status, 403);
  assert.equal(harness.rows.length, 0);
});

test("valid business_agent delegation -> authorized create", async () => {
  authorizeBusiness({ userId: "user-owner-1" });
  const res = await agentCreatePost(agentRequest());
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.equal(harness.rows[0].client_user_id, "user-owner-1");
});

test("valid consumer_agent delegation -> authorized create", async () => {
  authorizeConsumer();
  const res = await agentCreatePost(agentRequest());
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.match(json.request_id, /^REQ-/);
  assert.equal(typeof json.created_at, "string");
  assert.equal(harness.rows[0].client_user_id, "user-owner-1");
  assert.equal(harness.rows[0].status, "new");
  assert.equal(agentHarness.markUsedCalls.length, 1);
});

test("missing Idempotency-Key -> 400", async () => {
  authorizeConsumer();
  const res = await agentCreatePost(agentRequest({ idempotencyKey: null }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Idempotency-Key is required");
  assert.equal(harness.rows.length, 0);
});

test("invalid JSON body -> 400", async () => {
  authorizeConsumer();
  const res = await agentCreatePost(agentRequest({ rawBody: "{not-json" }));
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "invalid body");
});

test("unknown body fields -> 400", async () => {
  authorizeConsumer();
  const res = await agentCreatePost(
    agentRequest({ body: { ...VALID_BODY, budget_max: 90, user_id: "spoof" } }),
  );
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "unknown fields are not allowed");
});

test("missing contact name -> 400", async () => {
  authorizeConsumer();
  const res = await agentCreatePost(
    agentRequest({
      body: { ...VALID_BODY, user_contact: { email: SECRET_EMAIL } },
    }),
  );
  assert.equal(res.status, 400);
});

test("neither email nor phone -> 400", async () => {
  authorizeConsumer();
  const res = await agentCreatePost(
    agentRequest({
      body: { ...VALID_BODY, user_contact: { name: "Anna" } },
    }),
  );
  assert.equal(res.status, 400);
});

test("invalid work_format -> 400", async () => {
  authorizeConsumer();
  const res = await agentCreatePost(
    agentRequest({ body: { ...VALID_BODY, work_format: "in_person" } }),
  );
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "invalid work_format");
});

test("unsupported language or locale -> 400", async () => {
  authorizeConsumer();
  const language = await agentCreatePost(
    agentRequest({ body: { ...VALID_BODY, language: "en" } }),
  );
  assert.equal(language.status, 400);
  assert.equal((await language.json()).error, "unsupported language");

  const locale = await agentCreatePost(
    agentRequest({ body: { ...VALID_BODY, locale: "fr" } }),
  );
  assert.equal(locale.status, 400);
  assert.equal((await locale.json()).error, "unsupported locale");
});

test("service_request.client_user_id equals delegation.userId", async () => {
  authorizeBusiness({ userId: "delegated-user-9" });
  const res = await agentCreatePost(agentRequest());
  assert.equal(res.status, 200);
  assert.equal(harness.rows[0].client_user_id, "delegated-user-9");
});

test("body cannot override user identity", async () => {
  authorizeConsumer();
  const res = await agentCreatePost(
    agentRequest({
      body: {
        ...VALID_BODY,
        client_user_id: "attacker-user",
        user_id: "attacker-user",
      },
    }),
  );
  assert.equal(res.status, 400);
  assert.equal(harness.rows.length, 0);
});

test("successful create returns public request_id and created_at", async () => {
  authorizeConsumer();
  const res = await agentCreatePost(agentRequest());
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.request_id, harness.rows[0].public_id);
  assert.equal(json.created_at, harness.rows[0].created_at);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.equal(harness.notifyCalls.length, 1);
  assert.equal(harness.notifyCalls[0].eventType, "NEW_SERVICE_REQUEST");
  assert.equal(agentHarness.rateLimitCalls[0].identifier, "client-consumer-1");
  const storageKey = deriveAgentCreateServiceRequestStorageKey({
    agentClientId: "client-consumer-1",
    externalKey: IDEMPOTENCY_KEY,
  });
  assert.equal(harness.rows[0].client_idempotency_key, storageKey);
  assert.notEqual(harness.rows[0].client_idempotency_key, IDEMPOTENCY_KEY);
});

test("replay same key and payload returns the same identity", async () => {
  authorizeConsumer();
  const first = await agentCreatePost(agentRequest());
  const firstJson = await first.json();
  const second = await agentCreatePost(agentRequest());
  const secondJson = await second.json();
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(secondJson.request_id, firstJson.request_id);
  assert.equal(secondJson.created_at, firstJson.created_at);
  assert.equal(harness.rows.length, 1);
});

test("same key with different payload -> 409", async () => {
  authorizeConsumer();
  const first = await agentCreatePost(agentRequest());
  assert.equal(first.status, 200);
  const conflict = await agentCreatePost(
    agentRequest({
      body: { ...VALID_BODY, request_text: "A different description" },
    }),
  );
  assert.equal(conflict.status, 409);
  assert.equal(harness.rows.length, 1);
});

test("different agentClientId with the same external key creates independently", async () => {
  authorizeConsumer();
  const first = await agentCreatePost(agentRequest());
  const firstJson = await first.json();
  assert.equal(first.status, 200);

  agentHarness.auth = authorizedConsumer({
    identity: {
      clientId: "client-consumer-2",
      credentialId: "cred-consumer-2",
    },
  });
  agentHarness.delegation = authorizedDelegation({
    agentClientId: "client-consumer-2",
  });
  const second = await agentCreatePost(agentRequest());
  const secondJson = await second.json();
  assert.equal(second.status, 200);
  assert.notEqual(secondJson.request_id, firstJson.request_id);
  assert.equal(harness.rows.length, 2);
  assert.equal(harness.notifyCalls.length, 2);
  assert.notEqual(
    harness.rows[0].client_idempotency_key,
    harness.rows[1].client_idempotency_key,
  );
  assert.notEqual(harness.rows[0].client_idempotency_key, IDEMPOTENCY_KEY);
  assert.notEqual(harness.rows[1].client_idempotency_key, IDEMPOTENCY_KEY);
});

test("human row with the raw external Idempotency-Key does not collide", async () => {
  harness.rows.push({
    id: "human-row",
    public_id: "REQ-20260921-HUMAN1",
    created_at: "2026-09-21T10:00:00.000Z",
    status: "new",
    client_user_id: "user-owner-1",
    client_idempotency_key: IDEMPOTENCY_KEY,
    client_idempotency_fingerprint: "human-fingerprint",
  });
  authorizeConsumer();
  const res = await agentCreatePost(agentRequest());
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.notEqual(json.request_id, "REQ-20260921-HUMAN1");
  assert.equal(harness.rows.length, 2);
  assert.equal(
    harness.rows.some((row) => row.client_idempotency_key === IDEMPOTENCY_KEY),
    true,
  );
  assert.equal(
    harness.rows.some((row) => row.client_idempotency_key === IDEMPOTENCY_KEY && row.public_id === json.request_id),
    false,
  );
});

test("same business agent cannot reuse the key for another delegated user", async () => {
  authorizeBusiness({ userId: "user-owner-1" });
  const first = await agentCreatePost(agentRequest());
  assert.equal(first.status, 200);

  authorizeBusiness({ userId: "user-other-2" });
  const conflict = await agentCreatePost(agentRequest());
  const json = await conflict.json();
  assert.equal(conflict.status, 409);
  assert.equal(json.error, "Idempotency key unavailable for current auth context");
  assert.equal(harness.rows.length, 1);
  assert.equal(harness.notifyCalls.length, 1);
});

test("missing Content-Type -> 415", async () => {
  authorizeConsumer();
  const res = await agentCreatePost(agentRequest({ contentType: null }));
  const json = await res.json();
  assert.equal(res.status, 415);
  assert.equal(json.error, "application/json required");
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.equal(harness.rows.length, 0);
});

test("text/plain Content-Type -> 415", async () => {
  authorizeConsumer();
  const res = await agentCreatePost(agentRequest({ contentType: "text/plain" }));
  assert.equal(res.status, 415);
  assert.equal((await res.json()).error, "application/json required");
});

test("application/json Content-Type is accepted", async () => {
  authorizeConsumer();
  const res = await agentCreatePost(
    agentRequest({ contentType: "application/json" }),
  );
  assert.equal(res.status, 200);
});

test("application/json; charset=utf-8 is accepted", async () => {
  authorizeConsumer();
  const res = await agentCreatePost(
    agentRequest({ contentType: "application/json; charset=utf-8" }),
  );
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ok, true);
});

test("replay sends no second notification", async () => {
  authorizeConsumer();
  await agentCreatePost(agentRequest());
  await agentCreatePost(agentRequest());
  assert.equal(harness.notifyCalls.length, 1);
  assert.equal(
    agentHarness.auditEvents.filter((event) => event.metadata?.reason === "replayed")
      .length,
    1,
  );
});

test("response has no PII or internal ids", async () => {
  authorizeConsumer();
  const res = await agentCreatePost(
    agentRequest({
      body: {
        ...VALID_BODY,
        user_contact: {
          name: "Anna",
          email: SECRET_EMAIL,
          phone: SECRET_PHONE,
        },
      },
    }),
  );
  const json = await res.json();
  const serialized = JSON.stringify(json);
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(json).sort(), ["created_at", "ok", "request_id"]);
  assert.equal(serialized.includes(SECRET_EMAIL), false);
  assert.equal(serialized.includes(SECRET_PHONE), false);
  assert.equal(serialized.includes("user-owner-1"), false);
  assert.equal(serialized.includes(IDEMPOTENCY_KEY), false);
  const storageKey = deriveAgentCreateServiceRequestStorageKey({
    agentClientId: "client-consumer-1",
    externalKey: IDEMPOTENCY_KEY,
  });
  assert.ok(storageKey);
  assert.equal(serialized.includes(storageKey), false);
  assert.equal(
    serialized.includes("11111111-2222-3333-4444-555555555555"),
    false,
  );
  assert.equal(json.client_email, undefined);
  assert.equal(json.client_phone, undefined);
  assert.equal(json.client_user_id, undefined);
  assert.equal(json.public_id, undefined);
  assert.equal(json.id, undefined);
});

test("audit does not contain Authorization, credential, delegation payload, or contact", async () => {
  authorizeConsumer();
  await agentCreatePost(
    agentRequest({
      body: {
        ...VALID_BODY,
        user_contact: {
          name: "Anna",
          email: SECRET_EMAIL,
          phone: SECRET_PHONE,
        },
      },
    }),
  );
  const blob = auditBlob();
  assert.equal(blob.includes("Authorization"), false);
  assert.equal(blob.includes("Bearer "), false);
  assert.equal(blob.includes(RAW_CREDENTIAL), false);
  assert.equal(blob.includes(SECRET_EMAIL), false);
  assert.equal(blob.includes(SECRET_PHONE), false);
  assert.equal(blob.includes("Need bookkeeping help"), false);
  assert.equal(blob.includes("allowedCapabilities"), false);
  assert.equal(blob.includes(IDEMPOTENCY_KEY), false);
  const storageKey = deriveAgentCreateServiceRequestStorageKey({
    agentClientId: "client-consumer-1",
    externalKey: IDEMPOTENCY_KEY,
  });
  assert.ok(storageKey);
  assert.equal(blob.includes(storageKey), false);
  const serializedResponse = JSON.stringify(
    agentHarness.auditEvents.find((event) => event.outcome === "success"),
  );
  assert.equal(serializedResponse.includes(storageKey), false);
  const success = agentHarness.auditEvents.find(
    (event) => event.outcome === "success",
  );
  assert.ok(success);
  assert.equal(success.requestId, harness.rows[0].public_id);
  assert.equal(success.metadata.reason, "created");
});

test("outcome audit failure does not fail a successful create", async () => {
  authorizeConsumer();
  agentHarness.auditShouldFail = true;
  const res = await agentCreatePost(agentRequest());
  assert.equal(res.status, 200);
  assert.equal(harness.rows.length, 1);
});

test("human POST contract source remains cookie/bearer based and unversioned", () => {
  const source = readFileSync(
    join(process.cwd(), "app/api/service-requests/route.ts"),
    "utf8",
  );
  assert.match(source, /resolveBearerAuthUser/);
  assert.match(source, /cookies\(\)/);
  assert.match(source, /notifyIfServiceRequestCreated/);
  assert.equal(source.includes("runDelegatedAuthorization"), false);
  assert.equal(source.includes("/api/v1/agent/service-requests"), false);
});

test("agent create route is POST-only and does not use cookies or browser bearer", () => {
  const source = readFileSync(
    join(process.cwd(), "app/api/v1/agent/service-requests/route.ts"),
    "utf8",
  );
  assert.match(source, /export async function POST/);
  assert.equal(/export async function GET/.test(source), false);
  assert.match(source, /runDelegatedAuthorization/);
  assert.match(source, /resolveAgentCredential/);
  assert.match(source, /resolveAgentDelegation/);
  assert.match(source, /markAgentCredentialUsed/);
  assert.match(source, /recordAgentApiAuditEvent/);
  assert.match(source, /notifyIfServiceRequestCreated/);
  assert.equal(source.includes("cookies("), false);
  assert.equal(source.includes("resolveBearerAuthUser"), false);
  assert.equal(source.includes("ai_agent"), false);
});

test("MCP tools remain read-only", () => {
  const catalog = JSON.stringify(buildFreulyMcpToolCatalog());
  assert.equal(catalog.includes("create_service_request"), false);
  assert.equal(catalog.includes("/api/v1/agent/service-requests"), false);
});

test("A2A card remains read-only", () => {
  const card = JSON.stringify(buildFreulyA2AAgentCard());
  assert.equal(card.includes("create_service_request"), false);
  assert.equal(card.includes("/api/v1/agent/service-requests"), false);
});

test("ARD and OpenAPI discovery remain unchanged read-only surfaces", () => {
  const manifest = JSON.stringify(buildFreulyArdManifest());
  const document = buildFreulyReadOnlyOpenApiDocument() as {
    paths: Record<string, Record<string, unknown>>;
    "x-agent-safety": { writeCapabilitiesAdvertised: boolean };
  };
  assert.equal(manifest.includes("create_service_request"), false);
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      document.paths,
      "/api/v1/agent/service-requests",
    ),
    false,
  );
  assert.deepEqual(
    Object.keys(document.paths).sort(),
    ["/api/specialists/search", "/api/specialists/{id}"].sort(),
  );
  for (const item of Object.values(document.paths)) {
    assert.equal("post" in item, false);
  }
  assert.equal(document["x-agent-safety"].writeCapabilitiesAdvertised, false);
});
