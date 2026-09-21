import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { harness, resetHarness } from "./serviceRequests.harness.mjs";
import { cookieJar, resetCookieJar } from "./testMocks/next-cookies.mjs";

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
      "@/lib/auth/resolveBearerAuthUser": new URL("./testMocks/resolveBearerAuthUser.mjs", import.meta.url).href,
      "@/lib/clientCampaignLinks/service": new URL("./testMocks/clientCampaignService.mjs", import.meta.url).href,
      "server-only": new URL("./testMocks/server-only.mjs", import.meta.url).href,
      "next/headers": new URL("./testMocks/next-cookies.mjs", import.meta.url).href,
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
  service_timing_type: "flexible_period",
  service_timing_period: "flexible",
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

function publicCreateRequest(body) {
  return {
    json: async () => body,
    headers: { get: () => null },
  };
}

test.beforeEach(() => {
  resetHarness();
  resetCookieJar();
});

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

test("paid request UTM snapshot is stored on service_requests even without a cookie", async () => {
  const req = publicCreateRequest({
    ...validBody,
    preferred_language: "de",
    locale: "ua",
    source_path: "/ua/request",
    acquisition: {
      source: "meta",
      medium: "paid_social",
      campaign: "lead_form",
      content: "carousel",
      term: "fotograf",
      gclid: null,
      fbclid: "abc",
      referrer: "https://www.facebook.com/",
      landing_path: "/ua/request?utm_source=meta&utm_medium=paid_social&utm_campaign=lead_form",
      captured_at: "2026-09-17T17:00:00.000Z",
    },
  });
  const res = await createPost(req);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.equal(harness.rows.length, 1);
  assert.equal(harness.rows[0].preferred_language, "de");
  assert.equal(harness.rows[0].locale, "ua");
  assert.equal(harness.rows[0].source, "assisted_search");
  assert.equal(harness.rows[0].source_path, "/ua/request");
  assert.equal(harness.rows[0].acquisition_source, "meta");
  assert.equal(harness.rows[0].acquisition_medium, "paid_social");
  assert.equal(harness.rows[0].acquisition_campaign, "lead_form");
  assert.equal(harness.rows[0].acquisition_content, "carousel");
  assert.equal(harness.rows[0].acquisition_term, "fotograf");
  assert.equal(
    harness.rows[0].acquisition_landing_path,
    "/ua/request?utm_source=meta&utm_medium=paid_social&utm_campaign=lead_form",
  );
});

test("homepage submit without UTM keeps first-touch cookie instead of overwriting it", async () => {
  cookieJar.values.set(
    "freuly_acquisition_v1",
    encodeURIComponent(
      JSON.stringify({
        source: "google",
        medium: "cpc",
        campaign: "brand",
        content: null,
        term: null,
        gclid: "gclid-1",
        fbclid: null,
        referrer: "https://www.google.com/",
        landing_path: "/ru?utm_source=google&utm_medium=cpc&utm_campaign=brand",
        captured_at: "2026-08-01T10:00:00.000Z",
      }),
    ),
  );
  const req = publicCreateRequest({
    ...validBody,
    source_path: "/de/request",
    acquisition: {
      source: "direct",
      medium: null,
      campaign: null,
      content: null,
      term: null,
      gclid: null,
      fbclid: null,
      referrer: null,
      landing_path: "/de/request",
      captured_at: "2026-09-17T18:00:00.000Z",
    },
  });
  const res = await createPost(req);
  assert.equal(res.status, 200);
  assert.equal(harness.rows[0].acquisition_source, "google");
  assert.equal(harness.rows[0].acquisition_campaign, "brand");
  assert.equal(harness.rows[0].source_path, "/de/request");
});

test("authenticated create binds client_user_id on the HTTP route", async () => {
  harness.authUserId = "user-owner-1";
  const res = await createPost(publicCreateRequest(validBody));
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.equal(harness.rows[0].client_user_id, "user-owner-1");
});

test("invalid bearer is unauthorized", async () => {
  harness.authInvalid = true;
  const res = await createPost(publicCreateRequest(validBody));
  const json = await res.json();
  assert.equal(res.status, 401);
  assert.equal(json.error, "unauthorized");
  assert.equal(harness.rows.length, 0);
});

test("idempotent HTTP replay returns the same public_id and does not notify again", async () => {
  const body = { ...validBody, idempotency_key: "native:demand:abc12345" };
  const first = await createPost(publicCreateRequest(body));
  const firstJson = await first.json();
  const second = await createPost(publicCreateRequest(body));
  const secondJson = await second.json();
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(secondJson.public_id, firstJson.public_id);
  assert.equal(harness.rows.length, 1);
  assert.equal(harness.notifyCalls.length, 1);
});

test("idempotent HTTP conflict uses 409", async () => {
  const key = "native:demand:conflict1";
  await createPost(publicCreateRequest({ ...validBody, idempotency_key: key }));
  const res = await createPost(
    publicCreateRequest({ ...validBody, description: "Something else", idempotency_key: key }),
  );
  const json = await res.json();
  assert.equal(res.status, 409);
  assert.equal(json.error, "Idempotency key reused with different payload");
  assert.equal(harness.rows.length, 1);
});

