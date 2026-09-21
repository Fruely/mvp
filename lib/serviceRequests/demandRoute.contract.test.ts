import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { harness, resetHarness } from "./serviceRequests.harness.mjs";
import { resetCookieJar } from "./testMocks/next-cookies.mjs";

register(new URL("./demandRoute.contract.hooks.mjs", import.meta.url).href);

const { POST: createPost } = await import(
  new URL("../../app/api/service-requests/route.ts", import.meta.url).href
);

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
