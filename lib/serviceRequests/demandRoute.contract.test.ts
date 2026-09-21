import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { harness, resetHarness } from "./serviceRequests.harness.mjs";
import { resetCookieJar } from "./testMocks/next-cookies.mjs";

const CREATE_ROUTE = new URL("../../app/api/service-requests/route.ts", import.meta.url).href;

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

function publicCreateRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
    headers: { get: () => null },
  };
}

test.beforeEach(() => {
  resetHarness();
  resetCookieJar();
});

test("HTTP create contract still returns { ok, public_id, created_at }", async () => {
  const res = await createPost(publicCreateRequest(validBody));
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.ok, true);
  assert.match(json.public_id, /^REQ-/);
  assert.equal(typeof json.created_at, "string");
  assert.equal(json.client_email, undefined);
  assert.equal(harness.rows[0].status, "new");
  assert.equal(harness.notifyCalls.length, 1);
  assert.equal(harness.notifyCalls[0].eventType, "NEW_SERVICE_REQUEST");
});

test("HTTP authenticated create binds client_user_id", async () => {
  harness.authUserId = "user-owner-1";
  const res = await createPost(publicCreateRequest(validBody));
  assert.equal(res.status, 200);
  assert.equal(harness.rows[0].client_user_id, "user-owner-1");
});

test("HTTP invalid bearer remains 401", async () => {
  harness.authInvalid = true;
  const res = await createPost(publicCreateRequest(validBody));
  const json = await res.json();
  assert.equal(res.status, 401);
  assert.equal(json.error, "unauthorized");
});

test("HTTP idempotent replay does not notify twice", async () => {
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
