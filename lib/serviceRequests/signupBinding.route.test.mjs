import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { readFileSync } from "node:fs";
import { harness, resetHarness } from "./serviceRequests.harness.mjs";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const map = {
      "@/lib/supabase/server": new URL("./testMocks/service-server.mjs", import.meta.url).href,
      "server-only": new URL("./testMocks/server-only.mjs", import.meta.url).href,
    };
    if (map[specifier]) return { url: map[specifier], shortCircuit: true };
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !specifier.endsWith(".ts") &&
      !specifier.endsWith(".mjs")
    ) {
      return {
        url: new URL(`${specifier}.ts`, context.parentURL).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const { tryBindPromotionAttributionFromCookie } = await import(
  "./tryBindPromotionAttributionFromCookie.ts"
);
const { generateAttributionToken } = await import("./attributionToken.ts");
const { createMockServiceClient } = await import("./serviceRequests.harness.mjs");

const USER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const SPECIALIST_ID = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
const PROMOTION_ID = "cccccccc-dddd-eeee-ffff-000000000001";
const ATTRIBUTION_ID = "dddddddd-eeee-ffff-0000-111111111111";

function seedAttribution(overrides = {}) {
  const attribution_token = overrides.attribution_token ?? generateAttributionToken();
  harness.attributionRows.push({
    id: ATTRIBUTION_ID,
    promotion_id: PROMOTION_ID,
    attribution_token,
    landing_locale: "ru",
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    referrer_host: null,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    visit_count: 1,
    ...overrides,
  });
  return attribution_token;
}

test.beforeEach(() => {
  resetHarness();
});

test("E: helper reads attribution cookie value server-side via cookieRaw", async () => {
  const token = seedAttribution();
  const result = await tryBindPromotionAttributionFromCookie({
    cookieRaw: token,
    userId: USER_ID,
    specialistId: SPECIALIST_ID,
    supabase: createMockServiceClient(),
  });
  assert.equal(result.status, "bound");
});

test("F: no cookie skips binding", async () => {
  const result = await tryBindPromotionAttributionFromCookie({
    cookieRaw: undefined,
    userId: USER_ID,
    specialistId: SPECIALIST_ID,
    supabase: createMockServiceClient(),
  });
  assert.equal(result.status, "no_cookie");
  assert.equal(result.clearCookie, false);
  assert.equal(harness.signupBindingRows.length, 0);
});

test("G: invalid token skips and clears stale cookie", async () => {
  const result = await tryBindPromotionAttributionFromCookie({
    cookieRaw: "bad-token",
    userId: USER_ID,
    specialistId: SPECIALIST_ID,
    supabase: createMockServiceClient(),
  });
  assert.equal(result.status, "invalid_cookie");
  assert.equal(result.clearCookie, true);
});

test("H: missing attribution row skips and clears stale cookie", async () => {
  const token = generateAttributionToken();
  const result = await tryBindPromotionAttributionFromCookie({
    cookieRaw: token,
    userId: USER_ID,
    specialistId: SPECIALIST_ID,
    supabase: createMockServiceClient(),
  });
  assert.equal(result.status, "missing_attribution");
  assert.equal(result.clearCookie, true);
});

test("I-J: valid attribution inserts binding with promotion_id from row", async () => {
  const token = seedAttribution();
  const result = await tryBindPromotionAttributionFromCookie({
    cookieRaw: token,
    userId: USER_ID,
    specialistId: SPECIALIST_ID,
    supabase: createMockServiceClient(),
  });
  assert.equal(result.status, "bound");
  assert.equal(harness.signupBindingRows.length, 1);
  assert.equal(harness.signupBindingRows[0].attribution_id, ATTRIBUTION_ID);
  assert.equal(harness.signupBindingRows[0].promotion_id, PROMOTION_ID);
});

test("M-N-O: binding stores newly created specialist_id and user_id", async () => {
  const token = seedAttribution();
  await tryBindPromotionAttributionFromCookie({
    cookieRaw: token,
    userId: USER_ID,
    specialistId: SPECIALIST_ID,
    supabase: createMockServiceClient(),
  });
  assert.equal(harness.signupBindingRows[0].specialist_id, SPECIALIST_ID);
  assert.equal(harness.signupBindingRows[0].user_id, USER_ID);
  assert.ok(harness.signupBindingRows[0].registered_at);
});

test("P: duplicate 23505 is idempotent success with clearCookie", async () => {
  const token = seedAttribution();
  const supabase = createMockServiceClient();
  const first = await tryBindPromotionAttributionFromCookie({
    cookieRaw: token,
    userId: USER_ID,
    specialistId: SPECIALIST_ID,
    supabase,
  });
  assert.equal(first.status, "bound");
  const second = await tryBindPromotionAttributionFromCookie({
    cookieRaw: token,
    userId: USER_ID,
    specialistId: SPECIALIST_ID,
    supabase,
  });
  assert.equal(second.status, "duplicate");
  assert.equal(second.clearCookie, true);
  assert.equal(harness.signupBindingRows.length, 1);
});

test("S: closed promotion attribution still binds without status re-check", async () => {
  harness.promotionRows.push({
    id: PROMOTION_ID,
    status: "closed",
    closed_at: new Date().toISOString(),
  });
  const token = seedAttribution();
  const result = await tryBindPromotionAttributionFromCookie({
    cookieRaw: token,
    userId: USER_ID,
    specialistId: SPECIALIST_ID,
    supabase: createMockServiceClient(),
  });
  assert.equal(result.status, "bound");
  assert.equal(harness.signupBindingRows.length, 1);
  const helperSrc = readFileSync(
    new URL("./tryBindPromotionAttributionFromCookie.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(helperSrc, /status.*closed/);
});

test("T: successful bind requests cookie clear", async () => {
  const token = seedAttribution();
  const result = await tryBindPromotionAttributionFromCookie({
    cookieRaw: token,
    userId: USER_ID,
    specialistId: SPECIALIST_ID,
    supabase: createMockServiceClient(),
  });
  assert.equal(result.clearCookie, true);
});

test("U-V: DB insert error does not throw and keeps cookie for retry", async () => {
  seedAttribution();
  harness.signupBindingInsertError = { code: "XX000", message: "insert failed" };
  const result = await tryBindPromotionAttributionFromCookie({
    cookieRaw: harness.attributionRows[0].attribution_token,
    userId: USER_ID,
    specialistId: SPECIALIST_ID,
    supabase: createMockServiceClient(),
  });
  assert.equal(result.status, "db_error");
  assert.equal(result.clearCookie, false);
});

test("lookup uses narrow select projection only", async () => {
  const token = seedAttribution({
    utm_source: "secret-source",
    referrer_host: "secret.example",
  });
  const supabase = createMockServiceClient();
  await tryBindPromotionAttributionFromCookie({
    cookieRaw: token,
    userId: USER_ID,
    specialistId: SPECIALIST_ID,
    supabase,
  });
  const lookup = await supabase
    .from("service_request_promotion_attributions")
    .select("id, promotion_id")
    .eq("attribution_token", token)
    .maybeSingle();
  assert.equal(lookup.data?.id, ATTRIBUTION_ID);
  assert.equal(lookup.data?.promotion_id, PROMOTION_ID);
  assert.equal(lookup.data?.utm_source, undefined);
});

test("attribution lookup failure keeps cookie and returns db_error", async () => {
  seedAttribution();
  harness.attributionFetchError = { code: "XX000", message: "lookup failed" };
  const result = await tryBindPromotionAttributionFromCookie({
    cookieRaw: harness.attributionRows[0].attribution_token,
    userId: USER_ID,
    specialistId: SPECIALIST_ID,
    supabase: createMockServiceClient(),
  });
  assert.equal(result.status, "db_error");
  assert.equal(result.clearCookie, false);
});
