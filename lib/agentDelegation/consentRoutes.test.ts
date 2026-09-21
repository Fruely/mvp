import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { register } from "node:module";
import { join } from "node:path";
import test from "node:test";
import { buildFreulyA2AAgentCard } from "../agentCore/adapters/a2a.ts";
import { buildFreulyArdManifest } from "../agentCore/adapters/ard.ts";
import { buildFreulyMcpToolCatalog } from "../agentCore/adapters/mcp.ts";
import { buildFreulyReadOnlyOpenApiDocument } from "../agentCore/adapters/openapi.ts";
import { AGENT_USER_CONSENT_VERSION } from "./consent.ts";
import {
  consentHarness,
  resetConsentHarness,
  seedClient,
} from "./consentHarness.mjs";

register(new URL("./consentRoutes.hooks.mjs", import.meta.url).href);

const { GET: previewGet } = await import(
  new URL("../../app/api/client/agents/[id]/route.ts", import.meta.url).href
);
const { GET: listGet, POST: createPost } = await import(
  new URL("../../app/api/client/agent-delegations/route.ts", import.meta.url).href
);
const { PATCH: revokePatch } = await import(
  new URL(
    "../../app/api/client/agent-delegations/[id]/revoke/route.ts",
    import.meta.url,
  ).href
);

const USER_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_ID = "55555555-5555-4555-8555-555555555555";

function request(body, headers = {}) {
  const raw =
    body === undefined
      ? "{}"
      : typeof body === "string"
        ? body
        : JSON.stringify(body);
  return {
    headers: {
      get(name) {
        const key = String(name).toLowerCase();
        if (key in headers) return headers[key];
        if (key === "authorization") {
          return consentHarness.auth.kind === "authenticated"
            ? "Bearer user-access-token"
            : null;
        }
        if (key === "content-type") return "application/json";
        return null;
      },
    },
    async text() {
      return raw;
    },
  };
}

function cacheControl(response) {
  return (
    response.headers.get?.("Cache-Control") ??
    (response.headers instanceof Map
      ? response.headers.get("Cache-Control")
      : undefined)
  );
}

function authUser(userId = USER_ID) {
  consentHarness.auth = { kind: "authenticated", userId };
}

test.beforeEach(() => {
  resetConsentHarness();
});

test("missing, invalid and admin-only tokens are rejected", async () => {
  const client = seedClient();
  const missing = await createPost(request(createBody(client.id)));
  assert.equal(missing.status, 401);
  assert.equal(cacheControl(missing), "no-store");

  consentHarness.auth = { kind: "invalid" };
  const invalid = await createPost(request(createBody(client.id)));
  assert.equal(invalid.status, 401);

  consentHarness.auth = { kind: "absent" };
  const adminOnly = await createPost(
    request(createBody(client.id), { "x-admin-token": "admin-test-token" }),
  );
  assert.equal(adminOnly.status, 401);
  assert.equal(consentHarness.delegations.length, 0);
});

function createBody(agentClientId, overrides = {}) {
  return {
    agent_client_id: agentClientId,
    allowed_capabilities: ["create_service_request"],
    consent_version: AGENT_USER_CONSENT_VERSION,
    ...overrides,
  };
}

test("preview returns safe metadata and hides non-consentable agents", async () => {
  authUser();
  const business = seedClient();
  const owned = seedClient({
    name: "Mine",
    client_type: "consumer_agent",
    owner_user_id: USER_ID,
  });
  const foreign = seedClient({
    name: "Theirs",
    client_type: "consumer_agent",
    owner_user_id: OTHER_ID,
  });

  const ok = await previewGet(request(), { params: { id: business.id } });
  const json = await ok.json();
  assert.equal(ok.status, 200);
  assert.equal(cacheControl(ok), "no-store");
  assert.equal(json.data.consent_version, AGENT_USER_CONSENT_VERSION);
  assert.equal(json.data.scopes, undefined);
  assert.equal(json.data.owner_user_id, undefined);
  assert.doesNotMatch(JSON.stringify(json), /credential|pepper|key_prefix/i);

  const mine = await previewGet(request(), { params: { id: owned.id } });
  assert.equal(mine.status, 200);

  const hidden = await previewGet(request(), { params: { id: foreign.id } });
  assert.equal(hidden.status, 404);
});

test("user can create, list and revoke only their own delegations", async () => {
  authUser();
  const client = seedClient();
  const created = await createPost(request(createBody(client.id)));
  const createdJson = await created.json();
  assert.equal(created.status, 201);
  assert.equal(createdJson.data.allowed_capabilities[0], "create_service_request");
  assert.equal(createdJson.data.agent.client_type, "business_agent");
  assert.equal(consentHarness.delegations[0].user_id, USER_ID);

  const listed = await listGet(request());
  const listedJson = await listed.json();
  assert.equal(listed.status, 200);
  assert.equal(listedJson.items.length, 1);
  assert.equal(listedJson.items[0].delegation_id, createdJson.data.delegation_id);

  authUser(OTHER_ID);
  const otherList = await listGet(request());
  const otherJson = await otherList.json();
  assert.equal(otherJson.items.length, 0);
  const otherRevoke = await revokePatch(request({}), {
    params: { id: createdJson.data.delegation_id },
  });
  assert.equal(otherRevoke.status, 404);

  authUser();
  const revoke1 = await revokePatch(request({}), {
    params: { id: createdJson.data.delegation_id },
  });
  const revoke2 = await revokePatch(request({}), {
    params: { id: createdJson.data.delegation_id },
  });
  const revokeJson = await revoke1.json();
  assert.equal(revoke1.status, 200);
  assert.equal(revoke2.status, 200);
  assert.equal(revokeJson.data.status, "revoked");
  assert.ok(revokeJson.data.revoked_at);
  assert.equal(consentHarness.deleteCalls.length, 0);
});

test("user_id injection and unknown fields are rejected", async () => {
  authUser();
  const client = seedClient();
  const planted = await createPost(
    request({
      ...createBody(client.id),
      user_id: OTHER_ID,
    }),
  );
  assert.equal(planted.status, 400);
  assert.equal(consentHarness.delegations.length, 0);
});

test("consent routes use bearer user auth and never mention admin or secrets", () => {
  const files = [
    "app/api/client/agents/[id]/route.ts",
    "app/api/client/agent-delegations/route.ts",
    "app/api/client/agent-delegations/[id]/revoke/route.ts",
  ];
  for (const file of files) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.match(source, /resolveBearerAuthUser/);
    assert.doesNotMatch(source, /requireAdminToken|ADMIN_API_TOKEN/);
    assert.doesNotMatch(source, /\.delete\s*\(/);
    assert.doesNotMatch(source, /console\.(log|info|debug|warn)/);
    assert.doesNotMatch(source, /credential_hash|raw_credential|AGENT_API_KEY_PEPPER/);
    assert.doesNotMatch(source, /recordAgentApiAudit/);
  }
  assert.equal(
    existsSync(join(process.cwd(), "app/api/admin/agents/delegations/route.ts")),
    false,
  );
});

test("Agent write, admin provisioning and discovery stay unchanged", () => {
  const agentWrite = readFileSync(
    join(process.cwd(), "app/api/v1/agent/service-requests/route.ts"),
    "utf8",
  );
  assert.match(agentWrite, /runDelegatedAuthorization/);
  assert.doesNotMatch(agentWrite, /createUserDelegation|AGENT_USER_CONSENT_VERSION/);

  const adminClients = readFileSync(
    join(process.cwd(), "app/api/admin/agents/clients/route.ts"),
    "utf8",
  );
  assert.match(adminClients, /createAgentClient/);
  assert.doesNotMatch(adminClients, /createUserDelegation/);

  const human = readFileSync(
    join(process.cwd(), "app/api/service-requests/route.ts"),
    "utf8",
  );
  assert.match(human, /persistNewServiceRequest/);

  assert.equal(
    JSON.stringify(buildFreulyMcpToolCatalog()).includes("create_service_request"),
    false,
  );
  assert.equal(
    JSON.stringify(buildFreulyA2AAgentCard()).includes("create_service_request"),
    false,
  );
  assert.equal(
    JSON.stringify(buildFreulyArdManifest()).includes("create_service_request"),
    false,
  );
  const openapi = buildFreulyReadOnlyOpenApiDocument();
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      openapi.paths,
      "/api/v1/agent/service-requests",
    ),
    false,
  );
});
