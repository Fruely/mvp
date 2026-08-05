import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { harness, resetHarness } from "./serviceRequests.harness.mjs";

const CREATE_ROUTE = new URL("../../app/api/service-requests/route.ts", import.meta.url).href;
const ADMIN_LIST_ROUTE = new URL("../../app/api/admin/service-requests/route.ts", import.meta.url).href;
const ADMIN_DETAIL_ROUTE = new URL(
  "../../app/api/admin/service-requests/[id]/route.ts",
  import.meta.url,
).href;
const ADMIN_STATUS_ROUTE = new URL(
  "../../app/api/admin/service-requests/status/route.ts",
  import.meta.url,
).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./constants" && context.parentURL?.includes("validation.ts")) {
      return { url: new URL("./constants.ts", import.meta.url).href, shortCircuit: true };
    }
    const map = {
      "@/lib/supabase/server": new URL("./testMocks/service-server.mjs", import.meta.url).href,
      "@/lib/rate-limit/shared": new URL("./testMocks/rate-limit.mjs", import.meta.url).href,
      "@/lib/notifications/notify": new URL("./testMocks/notify.mjs", import.meta.url).href,
      "@/lib/adminApiAuth": new URL("./testMocks/adminApiAuth.mjs", import.meta.url).href,
      "@/lib/serviceRequests/constants": new URL("./constants.ts", import.meta.url).href,
      "@/lib/serviceRequests/publicId": new URL("./publicId.ts", import.meta.url).href,
      "@/lib/serviceRequests/validation": new URL("./validation.ts", import.meta.url).href,
      "next/server": new URL("../leads/testMocks/next-server.mjs", import.meta.url).href,
    };
    if (map[specifier]) return { url: map[specifier], shortCircuit: true };
    return nextResolve(specifier, context);
  },
});

const { POST: createPost } = await import(CREATE_ROUTE);
const { GET: adminList } = await import(ADMIN_LIST_ROUTE);
const { GET: adminDetail } = await import(ADMIN_DETAIL_ROUTE);
const { PATCH: adminStatus } = await import(ADMIN_STATUS_ROUTE);

const validBody = {
  client_name: "Anna",
  client_email: "anna@example.com",
  client_phone: null,
  description: "Need bookkeeping help",
  preferred_language: "ru",
  work_format: "online",
  urgency: "flexible",
  locale: "ru",
  hp: "",
};

function adminRequest(overrides = {}) {
  return {
    headers: { get: (k) => (k === "x-admin-token" ? harness.adminTokenExpected : null) },
    cookies: {
      get: (name) =>
        name === "admin_token" ? { value: harness.adminTokenExpected } : undefined,
    },
    ...overrides,
  };
}

test.beforeEach(() => resetHarness());

test("A: valid request created", async () => {
  const req = { json: async () => validBody };
  const res = await createPost(req);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.match(json.public_id, /^REQ-/);
  assert.equal(harness.rows.length, 1);
  assert.equal(harness.rows[0].status, "new");
  assert.equal(harness.notifyCalls.length, 1);
  assert.equal(harness.notifyCalls[0].payload.description, undefined);
});

test("K: create response contains no contacts", async () => {
  const req = { json: async () => validBody };
  const res = await createPost(req);
  const json = await res.json();
  assert.equal(json.client_email, undefined);
  assert.equal(json.client_phone, undefined);
  assert.equal(json.description, undefined);
});

test("L: raw DB error not exposed", async () => {
  harness.insertError = { message: "relation service_requests does not exist", code: "42P01" };
  const req = { json: async () => validBody };
  const res = await createPost(req);
  const json = await res.json();
  assert.equal(res.status, 500);
  assert.equal(json.error, "server_error");
});

test("M: notification failure does not roll back request", async () => {
  harness.notifyShouldFail = true;
  const req = { json: async () => validBody };
  const res = await createPost(req);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.equal(harness.rows.length, 1);
});

test("A-auth: unauthenticated cannot list", async () => {
  const req = { headers: { get: () => null }, cookies: { get: () => undefined } };
  const res = await adminList(req);
  assert.equal(res.status, 401);
});

test("B-auth: unauthenticated cannot read detail", async () => {
  const req = { headers: { get: () => null }, cookies: { get: () => undefined } };
  const res = await adminDetail(req, { params: { id: "11111111-2222-3333-4444-555555555555" } });
  assert.equal(res.status, 401);
});

test("C-auth: unauthenticated cannot update status", async () => {
  const req = {
    headers: { get: () => null },
    cookies: { get: () => undefined },
    json: async () => ({ id: "11111111-2222-3333-4444-555555555555", status: "reviewing" }),
  };
  const res = await adminStatus(req);
  assert.equal(res.status, 401);
});

test("O: anon cannot read request list", async () => {
  const req = { headers: { get: () => null }, cookies: { get: () => undefined } };
  const res = await adminList(req);
  assert.equal(res.status, 401);
});

test("P: non-admin cannot access admin queue", async () => {
  const req = {
    headers: { get: (k) => (k === "x-admin-token" ? "wrong" : null) },
    cookies: { get: () => undefined },
  };
  const res = await adminList(req);
  assert.equal(res.status, 401);
});

test("Q: admin can list requests via cookie session", async () => {
  harness.rows.push({
    id: "11111111-2222-3333-4444-555555555555",
    public_id: "REQ-20260805-ABCDEF",
    created_at: "2026-08-05T10:00:00.000Z",
    status: "new",
  });
  const res = await adminList(adminRequest());
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.data.length, 1);
});

test("F: list API never returns phone/email", async () => {
  harness.rows.push({
    id: "11111111-2222-3333-4444-555555555555",
    public_id: "REQ-20260805-ABCDEF",
    created_at: "2026-08-05T10:00:00.000Z",
    status: "new",
    client_email: "secret@example.com",
    client_phone: "+49123",
    description: "secret task",
  });
  const res = await adminList(adminRequest());
  const json = await res.json();
  const serialized = JSON.stringify(json);
  assert.doesNotMatch(serialized, /secret@example\.com/);
  assert.doesNotMatch(serialized, /\+49123/);
  assert.doesNotMatch(serialized, /secret task/);
});

test("R: admin can read contacts in detail", async () => {
  harness.rows.push({
    id: "11111111-2222-3333-4444-555555555555",
    public_id: "REQ-20260805-ABCDEF",
    client_name: "Anna",
    client_email: "anna@example.com",
    client_phone: "+49123",
    description: "Help",
    status: "new",
  });
  const res = await adminDetail(adminRequest(), {
    params: { id: "11111111-2222-3333-4444-555555555555" },
  });
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.data.client_email, "anna@example.com");
});

test("S: admin can update allowed status", async () => {
  harness.rows.push({
    id: "11111111-2222-3333-4444-555555555555",
    public_id: "REQ-20260805-ABCDEF",
    status: "new",
  });
  const req = {
    ...adminRequest(),
    json: async () => ({ id: "11111111-2222-3333-4444-555555555555", status: "reviewing" }),
  };
  const res = await adminStatus(req);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.data.status, "reviewing");
  assert.equal(harness.rows[0].status, "reviewing");
});
