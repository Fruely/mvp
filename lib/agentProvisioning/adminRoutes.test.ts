import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { register } from "node:module";
import { join } from "node:path";
import test from "node:test";
import { buildFreulyA2AAgentCard } from "../agentCore/adapters/a2a.ts";
import { buildFreulyArdManifest } from "../agentCore/adapters/ard.ts";
import { buildFreulyMcpToolCatalog } from "../agentCore/adapters/mcp.ts";
import { buildFreulyReadOnlyOpenApiDocument } from "../agentCore/adapters/openapi.ts";
import { parseAgentCredential } from "../agentAuth/credentials.ts";
import {
  provisioningHarness,
  resetProvisioningHarness,
} from "./testHarness.mjs";

register(new URL("./adminRoutes.hooks.mjs", import.meta.url).href);

const { POST: createClientPost } = await import(
  new URL("../../app/api/admin/agents/clients/route.ts", import.meta.url).href
);
const { POST: issueCredentialPost } = await import(
  new URL(
    "../../app/api/admin/agents/clients/[id]/credentials/route.ts",
    import.meta.url,
  ).href
);
const { PATCH: disableClientPatch } = await import(
  new URL(
    "../../app/api/admin/agents/clients/[id]/disable/route.ts",
    import.meta.url,
  ).href
);
const { PATCH: revokeCredentialPatch } = await import(
  new URL(
    "../../app/api/admin/agents/credentials/[id]/revoke/route.ts",
    import.meta.url,
  ).href
);

const ADMIN_TOKEN = "admin-test-token";
const PEPPER = "test-pepper-that-is-definitely-longer-than-32-characters";
const FUTURE_ISO = "2099-01-01T00:00:00.000Z";

function adminRequest(body, options = {}) {
  const raw =
    body === undefined
      ? "{}"
      : typeof body === "string"
        ? body
        : JSON.stringify(body);
  const token = "token" in options ? options.token : ADMIN_TOKEN;
  return {
    headers: {
      get(name) {
        const key = String(name).toLowerCase();
        if (key === "x-admin-token") return token ?? null;
        if (key === "content-type") return "application/json";
        return null;
      },
    },
    cookies: {
      get() {
        return undefined;
      },
    },
    async text() {
      return raw;
    },
    async json() {
      return JSON.parse(raw);
    },
  };
}

function cacheControl(response) {
  return (
    response.headers.get?.("Cache-Control") ??
    response.headers.get?.("cache-control") ??
    (response.headers instanceof Map
      ? response.headers.get("Cache-Control")
      : undefined)
  );
}

async function createConsumer() {
  const response = await createClientPost(
    adminRequest({
      name: "Example consumer agent",
      client_type: "consumer_agent",
      scopes: ["requests:create"],
    }),
  );
  const json = await response.json();
  return { response, json };
}

test.beforeEach(() => {
  resetProvisioningHarness();
  process.env.ADMIN_API_TOKEN = ADMIN_TOKEN;
  process.env.AGENT_API_KEY_PEPPER = PEPPER;
});

test("unauthenticated admin routes are rejected", async () => {
  const create = await createClientPost(adminRequest({
    name: "Example consumer agent",
    client_type: "consumer_agent",
    scopes: ["requests:create"],
  }, { token: null }));
  assert.equal(create.status, 401);
  assert.equal(cacheControl(create), "no-store");

  const issue = await issueCredentialPost(
    adminRequest({}, { token: null }),
    { params: { id: "11111111-1111-4111-8111-000000000001" } },
  );
  assert.equal(issue.status, 401);

  const revoke = await revokeCredentialPatch(
    adminRequest({}, { token: "wrong" }),
    { params: { id: "22222222-2222-4222-8222-000000000001" } },
  );
  assert.equal(revoke.status, 401);

  const disable = await disableClientPatch(
    adminRequest({}, { token: null }),
    { params: { id: "11111111-1111-4111-8111-000000000001" } },
  );
  assert.equal(disable.status, 401);
  assert.equal(provisioningHarness.clients.length, 0);
});

test("admin POST clients returns 201 safe client fields only", async () => {
  const { response, json } = await createConsumer();
  assert.equal(response.status, 201);
  assert.equal(cacheControl(response), "no-store");
  assert.equal(json.data.client_type, "consumer_agent");
  assert.equal(json.data.status, "active");
  assert.equal(json.data.scopes.length, 1);
  assert.equal(json.credential_hash, undefined);
  assert.equal(json.data.credential_hash, undefined);
  assert.equal(json.data.raw_credential, undefined);
  assert.doesNotMatch(JSON.stringify(json), /AGENT_API_KEY_PEPPER|pepper/i);
});

test("admin POST credentials returns raw once, never hash or pepper", async () => {
  const created = await createConsumer();
  const response = await issueCredentialPost(
    adminRequest({}),
    { params: { id: created.json.data.id } },
  );
  const json = await response.json();
  assert.equal(response.status, 201);
  assert.equal(cacheControl(response), "no-store");
  assert.equal(
    json.warning,
    "This credential is shown once and cannot be recovered.",
  );
  const parsed = parseAgentCredential(json.data.raw_credential);
  assert.ok(parsed);
  assert.equal(parsed.keyPrefix, json.data.key_prefix);
  assert.equal(json.data.credential_hash, undefined);
  assert.equal(json.credential_hash, undefined);
  assert.doesNotMatch(JSON.stringify(json), /AGENT_API_KEY_PEPPER|pepper/i);
  assert.doesNotMatch(
    JSON.stringify(provisioningHarness.credentials[0]),
    new RegExp(json.data.raw_credential),
  );
  assert.equal(provisioningHarness.lastCredentialInsert.raw_credential, undefined);
});

test("credential issuance fails closed without pepper", async () => {
  delete process.env.AGENT_API_KEY_PEPPER;
  const created = await createConsumer();
  const response = await issueCredentialPost(
    adminRequest({}),
    { params: { id: created.json.data.id } },
  );
  assert.equal(response.status, 503);
  const json = await response.json();
  assert.equal(json.data, undefined);
  assert.equal(provisioningHarness.credentials.length, 0);

  process.env.AGENT_API_KEY_PEPPER = "too-short";
  const short = await issueCredentialPost(
    adminRequest({}),
    { params: { id: created.json.data.id } },
  );
  assert.equal(short.status, 503);
});

test("disabled and missing clients cannot be issued credentials", async () => {
  const created = await createConsumer();
  await disableClientPatch(adminRequest({}), {
    params: { id: created.json.data.id },
  });
  const disabled = await issueCredentialPost(adminRequest({}), {
    params: { id: created.json.data.id },
  });
  assert.equal(disabled.status, 409);

  const missing = await issueCredentialPost(adminRequest({}), {
    params: { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" },
  });
  assert.equal(missing.status, 404);
});

test("optional future expiry is accepted over HTTP; past expiry is rejected", async () => {
  const created = await createConsumer();
  const future = await issueCredentialPost(
    adminRequest({ expires_at: FUTURE_ISO }),
    { params: { id: created.json.data.id } },
  );
  const futureJson = await future.json();
  assert.equal(future.status, 201);
  assert.equal(futureJson.data.expires_at, FUTURE_ISO);

  const past = await issueCredentialPost(
    adminRequest({ expires_at: "2020-01-01T00:00:00.000Z" }),
    { params: { id: created.json.data.id } },
  );
  assert.equal(past.status, 400);
});

test("revoke and disable are idempotent and return only safe status data", async () => {
  const created = await createConsumer();
  const issued = await issueCredentialPost(adminRequest({}), {
    params: { id: created.json.data.id },
  });
  const issuedJson = await issued.json();

  const revoke1 = await revokeCredentialPatch(adminRequest({}), {
    params: { id: issuedJson.data.credential_id },
  });
  const revoke2 = await revokeCredentialPatch(adminRequest({}), {
    params: { id: issuedJson.data.credential_id },
  });
  const revokeJson = await revoke1.json();
  assert.equal(revoke1.status, 200);
  assert.equal(revoke2.status, 200);
  assert.equal(revokeJson.data.status, "revoked");
  assert.ok(revokeJson.data.revoked_at);
  assert.equal(revokeJson.data.raw_credential, undefined);
  assert.equal(revokeJson.data.credential_hash, undefined);
  assert.equal(cacheControl(revoke1), "no-store");

  const disable1 = await disableClientPatch(adminRequest({}), {
    params: { id: created.json.data.id },
  });
  const disable2 = await disableClientPatch(adminRequest({}), {
    params: { id: created.json.data.id },
  });
  const disableJson = await disable1.json();
  assert.equal(disable1.status, 200);
  assert.equal(disable2.status, 200);
  assert.equal(disableJson.data.status, "disabled");
  assert.equal(provisioningHarness.credentials.length, 1);
  assert.equal(provisioningHarness.credentials[0].status, "revoked");
  assert.equal(provisioningHarness.deleteCalls.length, 0);
});

test("unknown JSON fields are rejected on every admin provisioning route", async () => {
  const created = await createClientPost(
    adminRequest({
      name: "Example consumer agent",
      client_type: "consumer_agent",
      scopes: ["requests:create"],
      metadata: {},
    }),
  );
  assert.equal(created.status, 400);

  const ok = await createConsumer();
  const extraCred = await issueCredentialPost(
    adminRequest({ raw_credential: "nope" }),
    { params: { id: ok.json.data.id } },
  );
  assert.equal(extraCred.status, 400);

  const extraDisable = await disableClientPatch(
    adminRequest({ status: "active" }),
    { params: { id: ok.json.data.id } },
  );
  assert.equal(extraDisable.status, 400);
});

test("admin agent routes require requireAdminToken and never expose secrets", () => {
  const files = [
    "app/api/admin/agents/clients/route.ts",
    "app/api/admin/agents/clients/[id]/credentials/route.ts",
    "app/api/admin/agents/clients/[id]/disable/route.ts",
    "app/api/admin/agents/credentials/[id]/revoke/route.ts",
  ];
  for (const file of files) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.match(source, /requireAdminToken/);
    assert.doesNotMatch(source, /\.delete\s*\(/);
    assert.doesNotMatch(source, /console\.(log|info|debug|warn)/);
    assert.doesNotMatch(source, /NEXT_PUBLIC_/);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.doesNotMatch(source, /credential_hash/);
    assert.doesNotMatch(source, /AGENT_API_KEY_PEPPER/);
  }

  assert.equal(
    existsSync(join(process.cwd(), "app/api/admin/agents/delegations/route.ts")),
    false,
  );
});

test("Agent write runtime, human demand, and discovery stay unchanged", () => {
  const agentWrite = readFileSync(
    join(process.cwd(), "app/api/v1/agent/service-requests/route.ts"),
    "utf8",
  );
  assert.match(agentWrite, /runDelegatedAuthorization/);
  assert.match(agentWrite, /parseAgentCreateServiceRequestInput/);
  assert.doesNotMatch(agentWrite, /createAgentClient|issueAgentCredential/);

  const human = readFileSync(
    join(process.cwd(), "app/api/service-requests/route.ts"),
    "utf8",
  );
  assert.match(human, /persistNewServiceRequest/);
  assert.doesNotMatch(human, /issueAgentCredential/);

  const mcp = JSON.stringify(buildFreulyMcpToolCatalog());
  assert.equal(mcp.includes("create_service_request"), false);
  const a2a = JSON.stringify(buildFreulyA2AAgentCard());
  assert.equal(a2a.includes("create_service_request"), false);
  const ard = JSON.stringify(buildFreulyArdManifest());
  assert.equal(ard.includes("create_service_request"), false);
  const openapi = buildFreulyReadOnlyOpenApiDocument() as {
    paths: Record<string, Record<string, unknown>>;
  };
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      openapi.paths,
      "/api/v1/agent/service-requests",
    ),
    false,
  );
});

test("provisioning mocks never persist or audit the raw credential", () => {
  const mockDir = join(process.cwd(), "lib/agentProvisioning/testMocks");
  const sources = readdirSync(mockDir).map((name) =>
    readFileSync(join(mockDir, name), "utf8"),
  );
  sources.push(
    readFileSync(join(process.cwd(), "lib/agentProvisioning/testHarness.mjs"), "utf8"),
  );
  for (const source of sources) {
    assert.doesNotMatch(source, /raw_credential\s*:/);
    assert.doesNotMatch(source, /agent_api_audit_events/);
    assert.doesNotMatch(source, /frly_agent_/);
  }
});
