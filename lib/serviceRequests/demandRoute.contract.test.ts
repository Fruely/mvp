import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

const COACHES_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

function nativeLikeBody(overrides: Record<string, unknown> = {}) {
  return {
    ...validBody,
    category_id: null,
    category_text: "Коучи",
    preferred_language: "ua",
    service_languages: ["uk"],
    work_format: "online",
    ...overrides,
  };
}

test("native category text resolves to the exact catalogue id before persist", async () => {
  harness.catalogRows = [
    { category_id: COACHES_ID, title: "Coaches", title_ru: "Коучи", title_de: "Coaches", title_ua: "Коучи" },
  ];
  const res = await createPost(publicCreateRequest(nativeLikeBody()));
  assert.equal(res.status, 200);
  assert.equal(harness.rows.length, 1);
  assert.equal(harness.rows[0].category_id, COACHES_ID);
  assert.equal(harness.rows[0].category_text, "Коучи");
  assert.deepEqual(harness.rows[0].service_languages, ["uk"]);
  assert.equal(harness.rows[0].work_format, "online");
  assert.equal(harness.notifyCalls.length, 1);
});

test("an ambiguous category is stored unresolved and still notifies the owner", async () => {
  harness.catalogRows = [
    { category_id: COACHES_ID, title_ua: "Коучи" },
    { category_id: OTHER_ID, title: "Коучи" },
  ];
  const res = await createPost(publicCreateRequest(nativeLikeBody()));
  assert.equal(res.status, 200);
  assert.equal(harness.rows.length, 1);
  assert.equal(harness.rows[0].category_id, null);
  assert.equal(harness.rows[0].category_text, "Коучи");
  assert.equal(harness.notifyCalls.length, 1);
});

test("an unknown category text is stored with a null category id", async () => {
  const res = await createPost(publicCreateRequest(nativeLikeBody()));
  assert.equal(res.status, 200);
  assert.equal(harness.rows.length, 1);
  assert.equal(harness.rows[0].category_id, null);
  assert.equal(harness.notifyCalls.length, 1);
});

test("a catalogue read error does not create the request", async () => {
  harness.catalogError = { message: "boom" };
  const res = await createPost(publicCreateRequest(nativeLikeBody()));
  const json = await res.json();
  assert.equal(res.status, 500);
  assert.equal(json.error, "server_error");
  assert.equal(harness.rows.length, 0);
  assert.equal(harness.notifyCalls.length, 0);
});

test("an existing category id skips catalogue lookup", async () => {
  harness.catalogRows = [{ category_id: OTHER_ID, title: "Коучи" }];
  const res = await createPost(publicCreateRequest(nativeLikeBody({ category_id: COACHES_ID })));
  assert.equal(res.status, 200);
  assert.equal(harness.rows[0].category_id, COACHES_ID);
  assert.equal(harness.catalogReads, 0);
});

test("category resolution stays on the public create route", () => {
  const publicRoute = readFileSync(new URL("../../app/api/service-requests/route.ts", import.meta.url), "utf8");
  const agentRoute = readFileSync(new URL("../../app/api/v1/agent/service-requests/route.ts", import.meta.url), "utf8");
  const extractRoute = readFileSync(new URL("../../app/api/intent/extract/route.ts", import.meta.url), "utf8");
  const suggest = readFileSync(new URL("../categories/suggestCategories.ts", import.meta.url), "utf8");
  const intake = readFileSync(new URL("../serviceIntent/intake.ts", import.meta.url), "utf8");
  const create = readFileSync(new URL("./createServiceRequest.ts", import.meta.url), "utf8");
  assert.equal(publicRoute.includes("resolveExactCategoryId"), true);
  assert.equal(agentRoute.includes("resolveExactCategoryId"), false);
  assert.equal(extractRoute.includes("resolveExactCategoryId"), false);
  assert.equal(suggest.includes("resolveExactCategoryId"), false);
  assert.equal(intake.includes("resolveExactCategoryId"), false);
  const payloadStart = create.indexOf("function buildServiceRequestIdempotencyPayload");
  const payloadEnd = create.indexOf("export function buildServiceRequestIdempotencyFingerprint");
  const payload = create.slice(payloadStart, payloadEnd);
  assert.equal(payload.includes("service_languages"), false);
  assert.equal(payload.includes("category_id"), true);
});

const ownedDemand = {
  description: "Need an online coach",
  preferred_language: "ua",
  service_languages: ["uk"],
  work_format: "online",
  service_timing_type: "asap",
  locale: "ua",
  hp: "",
};

test("authenticated human create succeeds without copied identity", async () => {
  harness.authUserId = "user-owner-1";
  const res = await createPost(publicCreateRequest({
    ...ownedDemand,
    client_user_id: "attacker-user",
    client_name: "Spoofed",
    client_email: "spoof@example.com",
    client_phone: "+490000",
  }));
  assert.equal(res.status, 200);
  assert.equal(harness.rows.length, 1);
  assert.equal(harness.rows[0].client_user_id, "user-owner-1");
  assert.equal(harness.rows[0].client_name, null);
  assert.equal(harness.rows[0].client_email, null);
  assert.equal(harness.rows[0].client_phone, null);
});

test("missing bearer still uses the anonymous contact contract", async () => {
  const missingName = await createPost(publicCreateRequest({ ...validBody, client_name: "  " }));
  assert.equal(missingName.status, 400);
  const missingContact = await createPost(publicCreateRequest({
    ...validBody,
    client_email: null,
    client_phone: null,
  }));
  assert.equal(missingContact.status, 400);
  const created = await createPost(publicCreateRequest(validBody));
  assert.equal(created.status, 200);
  assert.equal(harness.rows[0].client_user_id, null);
  assert.equal(harness.rows[0].client_name, "Anna");
  assert.equal(harness.rows[0].client_email, "anna@example.com");
});

test("authenticated retries of the same owned demand replay", async () => {
  harness.authUserId = "user-owner-1";
  const body = { ...ownedDemand, idempotency_key: "native:demand:owned1234" };
  const first = await createPost(publicCreateRequest(body));
  const second = await createPost(publicCreateRequest({
    ...body,
    client_name: "Different",
    client_email: "other@example.com",
  }));
  const firstJson = await first.json();
  const secondJson = await second.json();
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(secondJson.public_id, firstJson.public_id);
  assert.equal(harness.rows.length, 1);
});

test("the same idempotency key under another owner conflicts", async () => {
  harness.authUserId = "user-owner-1";
  const body = { ...ownedDemand, idempotency_key: "native:demand:owned9999" };
  const first = await createPost(publicCreateRequest(body));
  assert.equal(first.status, 200);
  harness.authUserId = "user-other-2";
  const second = await createPost(publicCreateRequest(body));
  assert.equal(second.status, 409);
  assert.equal(harness.rows.length, 1);
  assert.equal(harness.rows[0].client_user_id, "user-owner-1");
});
