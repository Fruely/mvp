import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { harness, resetHarness } from "./unlockContacts.harness.mjs";

const ROUTE_URL = new URL(
  "../../app/api/specialist/leads/[id]/unlock-contacts/route.ts",
  import.meta.url,
).href;

registerHooks({
  resolve(specifier, _context, nextResolve) {
    const aliasMap = {
      "@/lib/supabase/auth-server": new URL("./testMocks/auth-server.mjs", import.meta.url).href,
      "@/lib/supabase/server": new URL("./testMocks/service-server.mjs", import.meta.url).href,
      "@/lib/email": new URL("./testMocks/email.mjs", import.meta.url).href,
      "@/lib/leads/contactUnlock": new URL("./contactUnlock.ts", import.meta.url).href,
      "next/server": new URL("./testMocks/next-server.mjs", import.meta.url).href,
    };
    if (aliasMap[specifier]) {
      return { url: aliasMap[specifier], shortCircuit: true };
    }
    return nextResolve(specifier);
  },
});

const { POST } = await import(ROUTE_URL);

const LEAD_ID = "11111111-2222-3333-4444-555555555555";
const OWN_SPEC_ID = "spec-own-1111";
const OTHER_SPEC_ID = "spec-other-2222";
const USER_ID = "user-own-aaaa-bbbb-cccc-dddddddddddd";

function baseLead(overrides = {}) {
  return {
    id: LEAD_ID,
    specialist_id: OWN_SPEC_ID,
    status: "new",
    created_at: "2026-08-05T10:00:00.000Z",
    source: "specialist_profile",
    source_path: "/ru/specialist/test",
    contact_unlocked_at: null,
    contact_unlocked_by: null,
    client_name: "Anna Client",
    client_email: "anna.client@example.com",
    client_phone: "+491701234567",
    message: "Need tax help in Berlin.",
    ...overrides,
  };
}

function activeSpecialist(overrides = {}) {
  return {
    id: OWN_SPEC_ID,
    user_id: USER_ID,
    status: "active",
    ...overrides,
  };
}

async function callUnlock(leadId = LEAD_ID, body = null) {
  const request = {
    method: "POST",
    json: async () => (body ?? {}),
  };
  const response = await POST(request, { params: { id: leadId } });
  const json = await response.json();
  return { response, json, status: response.status };
}

test.beforeEach(() => {
  resetHarness();
});

test("A: unauthenticated request rejected", async () => {
  harness.authUser = null;
  harness.authError = { message: "no session" };

  const { status, json } = await callUnlock();
  assert.equal(status, 401);
  assert.equal(json.error, "unauthorized");
  assert.equal(harness.emailCalls.length, 0);
});

test("B: authenticated user without specialist profile rejected", async () => {
  harness.authUser = { id: USER_ID };
  harness.specialists = [];

  const { status, json } = await callUnlock();
  assert.equal(status, 404);
  assert.equal(json.error, "specialist_not_found");
  assert.equal(harness.emailCalls.length, 0);
});

test("C: blocked specialist rejected", async () => {
  harness.authUser = { id: USER_ID };
  harness.specialists = [activeSpecialist({ status: "blocked" })];

  const { status, json } = await callUnlock();
  assert.equal(status, 403);
  assert.equal(json.error, "forbidden");
  assert.equal(harness.emailCalls.length, 0);
});

test("D: specialist cannot unlock another specialist's lead", async () => {
  harness.authUser = { id: USER_ID };
  harness.specialists = [activeSpecialist()];
  harness.leads = [baseLead({ specialist_id: OTHER_SPEC_ID })];

  const { status, json } = await callUnlock();
  assert.equal(status, 404);
  assert.equal(json.error, "lead_not_found");
  assert.equal(json.data, undefined);
  assert.equal(harness.emailCalls.length, 0);
});

test("E: client-supplied specialist_id cannot spoof ownership", async () => {
  harness.authUser = { id: USER_ID };
  harness.specialists = [activeSpecialist()];
  harness.leads = [baseLead({ specialist_id: OTHER_SPEC_ID })];

  const { status, json } = await callUnlock(LEAD_ID, { specialist_id: OWN_SPEC_ID });
  assert.equal(status, 404);
  assert.equal(json.error, "lead_not_found");
  assert.equal(harness.leads[0].specialist_id, OTHER_SPEC_ID);
  assert.equal(harness.leads[0].contact_unlocked_at, null);
  assert.equal(harness.emailCalls.length, 0);
});

test("F: own specialist can unlock own lead", async () => {
  harness.authUser = { id: USER_ID };
  harness.specialists = [activeSpecialist()];
  harness.leads = [baseLead()];

  const { status, json } = await callUnlock();
  assert.equal(status, 200);
  assert.equal(json.data.client_email, "anna.client@example.com");
  assert.equal(json.data.client_phone, "+491701234567");
  assert.equal(json.data.message, "Need tax help in Berlin.");
  assert.equal(harness.emailCalls.length, 1);
});

test("G: first unlock writes contact_unlocked_at and contact_unlocked_by", async () => {
  harness.authUser = { id: USER_ID };
  harness.specialists = [activeSpecialist()];
  harness.leads = [baseLead()];

  await callUnlock();
  assert.ok(harness.leads[0].contact_unlocked_at);
  assert.equal(harness.leads[0].contact_unlocked_by, USER_ID);
});

test("H: first unlock returns contacts only after successful ownership check", async () => {
  harness.authUser = { id: USER_ID };
  harness.specialists = [activeSpecialist()];
  harness.leads = [baseLead()];

  const { status, json } = await callUnlock();
  assert.equal(status, 200);
  assert.equal(json.data.id, LEAD_ID);
  assert.equal(json.data.client_name, "Anna Client");
  assert.equal(json.data.client_email, "anna.client@example.com");
  assert.equal(json.data.client_phone, "+491701234567");
  assert.equal(json.data.message, "Need tax help in Berlin.");
});

test("I: repeat unlock preserves original timestamp", async () => {
  const originalTs = "2026-08-05T11:00:00.000Z";
  harness.authUser = { id: USER_ID };
  harness.specialists = [activeSpecialist()];
  harness.leads = [
    baseLead({
      contact_unlocked_at: originalTs,
      contact_unlocked_by: USER_ID,
    }),
  ];

  const { status, json } = await callUnlock();
  assert.equal(status, 200);
  assert.equal(json.data.contact_unlocked_at, originalTs);
  assert.equal(harness.leads[0].contact_unlocked_at, originalTs);
});

test("J: repeat unlock does not send client email", async () => {
  harness.authUser = { id: USER_ID };
  harness.specialists = [activeSpecialist()];
  harness.leads = [
    baseLead({
      contact_unlocked_at: "2026-08-05T11:00:00.000Z",
      contact_unlocked_by: USER_ID,
    }),
  ];

  await callUnlock();
  assert.equal(harness.emailCalls.length, 0);
});

test("K: concurrent race refetches unlocked row without duplicate email", async () => {
  const raceTs = "2026-08-05T11:30:00.000Z";
  harness.authUser = { id: USER_ID };
  harness.specialists = [activeSpecialist()];
  harness.leads = [baseLead()];
  harness.forceUpdateMiss = true;
  harness.simulateConcurrentUnlock = true;
  harness.concurrentUnlockTimestamp = raceTs;
  harness.concurrentUnlockBy = "other-user-id";

  const { status, json } = await callUnlock();
  assert.equal(status, 200);
  assert.equal(json.data.contact_unlocked_at, raceTs);
  assert.equal(json.data.client_email, "anna.client@example.com");
  assert.equal(harness.emailCalls.length, 0);
});

test("L: nonexistent lead does not disclose foreign contacts", async () => {
  harness.authUser = { id: USER_ID };
  harness.specialists = [activeSpecialist()];
  harness.leads = [
    baseLead({
      id: "99999999-9999-9999-9999-999999999999",
      specialist_id: OTHER_SPEC_ID,
      client_email: "secret.foreign@example.com",
      client_phone: "+499999999999",
    }),
  ];

  const { status, json } = await callUnlock(LEAD_ID);
  assert.equal(status, 404);
  assert.equal(json.error, "lead_not_found");
  assert.equal(json.data, undefined);
  assert.doesNotMatch(JSON.stringify(json), /secret\.foreign@example\.com/);
  assert.doesNotMatch(JSON.stringify(json), /\+499999999999/);
  assert.equal(harness.emailCalls.length, 0);
});

test("M: DB/internal errors do not return raw database details", async () => {
  harness.authUser = { id: USER_ID };
  harness.specialists = [activeSpecialist()];
  harness.leads = [baseLead()];
  harness.leadFetchError = {
    message: "relation leads does not exist",
    code: "42P01",
    details: "Sensitive postgres detail",
  };

  const { status, json } = await callUnlock();
  assert.equal(status, 500);
  assert.equal(json.error, "server_error");
  assert.equal(json.details, undefined);
  assert.doesNotMatch(JSON.stringify(json), /42P01/);
  assert.doesNotMatch(JSON.stringify(json), /postgres/i);
  assert.doesNotMatch(JSON.stringify(json), /Sensitive postgres detail/);
});
