import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { harness, resetHarness } from "./serviceRequests.harness.mjs";
import { cookieJar, resetCookieJar } from "./testMocks/next-cookies.mjs";

const CAPTURE_ROUTE = new URL(
  "../../app/api/request-attribution/capture/route.ts",
  import.meta.url,
).href;

registerHooks({
  resolve(specifier, context, nextResolve) {
    const map = {
      "@/lib/supabase/server": new URL("./testMocks/service-server.mjs", import.meta.url).href,
      "@/lib/i18n": new URL("../i18n.ts", import.meta.url).href,
      "@/lib/serviceRequests/attributionCookie": new URL("./attributionCookie.ts", import.meta.url).href,
      "@/lib/serviceRequests/attributionSanitize": new URL("./attributionSanitize.ts", import.meta.url).href,
      "@/lib/serviceRequests/capturePromotionAttribution": new URL("./capturePromotionAttribution.ts", import.meta.url).href,
      "@/lib/serviceRequests/promotionPublicData": new URL("./promotionPublicData.ts", import.meta.url).href,
      "@/lib/serviceRequests/promotionToken": new URL("./promotionToken.ts", import.meta.url).href,
      "next/headers": new URL("./testMocks/next-cookies.mjs", import.meta.url).href,
      "next/server": new URL("../leads/testMocks/next-server.mjs", import.meta.url).href,
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

const { GET: captureGet } = await import(CAPTURE_ROUTE);
const {
  insertAttributionRow,
  getAttributionByToken,
  recordAttributionRepeatVisit,
} = await import("./promotionAttributionData.ts");
const {
  createPromotionAttributionCapture,
  tryRecordPromotionRepeatVisit,
} = await import("./capturePromotionAttribution.ts");
const { ATTRIBUTION_COOKIE_NAME } = await import("./attributionCookie.ts");

const PROMOTION_ID = "22222222-3333-4444-5555-666666666666";
const PROMOTION_TOKEN = "promoPublicToken123456";

function seedPublishedPromotion(overrides = {}) {
  harness.promotionRows.push({
    id: PROMOTION_ID,
    public_token: PROMOTION_TOKEN,
    locale: "ru",
    public_title: "Public title",
    public_summary: "Public summary",
    status: "published",
    published_at: "2026-08-05T10:00:00.000Z",
    closed_at: null,
    ...overrides,
  });
}

function makeCaptureRequest(query, headers = {}) {
  return {
    nextUrl: new URL(`http://localhost/api/request-attribution/capture?${query}`),
    headers: {
      get: (key) => headers[String(key).toLowerCase()] ?? null,
    },
  };
}

test.beforeEach(() => {
  resetHarness();
  resetCookieJar();
});

test("Q: first visit inserts attribution via capture route", async () => {
  seedPublishedPromotion();
  const res = await captureGet(
    makeCaptureRequest(
      `lang=ru&public_token=${PROMOTION_TOKEN}&utm_source=telegram&utm_term=ignored`,
      { referer: "https://t.me/channel/post" },
    ),
  );
  assert.equal(res.status, 204);
  assert.equal(harness.attributionRows.length, 1);
  assert.equal(harness.attributionRows[0].promotion_id, PROMOTION_ID);
  assert.equal(harness.attributionRows[0].utm_source, "telegram");
  assert.equal(harness.attributionRows[0].referrer_host, "t.me");
  assert.equal(harness.attributionRows[0].visit_count, 1);
  assert.equal(cookieJar.sets.length, 1);
  assert.equal(cookieJar.sets[0].name, ATTRIBUTION_COOKIE_NAME);
  assert.equal(cookieJar.sets[0].options.httpOnly, true);
  assert.equal(cookieJar.sets[0].value, harness.attributionRows[0].attribution_token);
});

test("R-T: repeat visit increments count and preserves first_seen_at and first-touch UTM", async () => {
  seedPublishedPromotion();
  const created = await insertAttributionRow({
    promotionId: PROMOTION_ID,
    landingLocale: "ru",
    utm: {
      utm_source: "telegram",
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
    },
    referrerHost: "t.me",
  });
  const firstSeen = created.first_seen_at;

  await recordAttributionRepeatVisit(created.attribution_token);
  const updated = await getAttributionByToken(created.attribution_token);
  assert.equal(updated.visit_count, 2);
  assert.equal(updated.first_seen_at, firstSeen);
  assert.equal(updated.utm_source, "telegram");

  await tryRecordPromotionRepeatVisit({
    promotionId: PROMOTION_ID,
    existingCookieToken: created.attribution_token,
  });
  const again = await getAttributionByToken(created.attribution_token);
  assert.equal(again.visit_count, 3);
});

test("U: missing DB row rotates token via new capture insert", async () => {
  seedPublishedPromotion();
  cookieJar.values.set(ATTRIBUTION_COOKIE_NAME, "staleCookieToken1234567");
  const res = await captureGet(
    makeCaptureRequest(`lang=ru&public_token=${PROMOTION_TOKEN}&utm_source=instagram`),
  );
  assert.equal(res.status, 204);
  assert.equal(harness.attributionRows.length, 1);
  assert.notEqual(cookieJar.sets[0].value, "staleCookieToken1234567");
});

test("V: different promotion rotates token to a new row", async () => {
  const otherPromotionId = "33333333-4444-5555-6666-777777777777";
  seedPublishedPromotion();
  harness.promotionRows.push({
    id: otherPromotionId,
    public_token: "otherPromotionToken12345",
    locale: "ru",
    public_title: "Other",
    public_summary: "Other summary",
    status: "published",
    published_at: "2026-08-05T11:00:00.000Z",
    closed_at: null,
  });
  const first = await insertAttributionRow({
    promotionId: PROMOTION_ID,
    landingLocale: "ru",
    utm: { utm_source: "telegram", utm_medium: null, utm_campaign: null, utm_content: null },
    referrerHost: null,
  });
  cookieJar.values.set(ATTRIBUTION_COOKIE_NAME, first.attribution_token);

  const res = await captureGet(
    makeCaptureRequest(`lang=ru&public_token=otherPromotionToken12345&utm_source=facebook`),
  );
  assert.equal(res.status, 204);
  assert.equal(harness.attributionRows.length, 2);
  assert.notEqual(cookieJar.sets[0].value, first.attribution_token);
  assert.equal(harness.attributionRows[1].promotion_id, otherPromotionId);
});

test("W-X-Y: draft/closed/unknown promotion creates no attribution", async () => {
  seedPublishedPromotion({ status: "draft", published_at: null });
  let res = await captureGet(makeCaptureRequest(`lang=ru&public_token=${PROMOTION_TOKEN}`));
  assert.equal(res.status, 404);
  assert.equal(harness.attributionRows.length, 0);

  resetHarness();
  seedPublishedPromotion({
    status: "closed",
    closed_at: "2026-08-05T12:00:00.000Z",
  });
  res = await captureGet(makeCaptureRequest(`lang=ru&public_token=${PROMOTION_TOKEN}`));
  assert.equal(res.status, 404);
  assert.equal(harness.attributionRows.length, 0);

  res = await captureGet(makeCaptureRequest("lang=ru&public_token=unknownPromotionToken1"));
  assert.equal(res.status, 404);
});

test("Z: capture insert failure returns 204 without throwing", async () => {
  seedPublishedPromotion();
  harness.attributionInsertError = { code: "XX000", message: "insert failed" };
  const res = await captureGet(makeCaptureRequest(`lang=ru&public_token=${PROMOTION_TOKEN}`));
  assert.equal(res.status, 204);
  assert.equal(cookieJar.sets.length, 0);
});

test("capture route response body is empty", async () => {
  seedPublishedPromotion();
  const res = await captureGet(makeCaptureRequest(`lang=ru&public_token=${PROMOTION_TOKEN}`));
  assert.equal(res.status, 204);
  assert.equal(res._body, null);
});

test("createPromotionAttributionCapture never returns token in failure mode", async () => {
  seedPublishedPromotion();
  harness.attributionInsertError = { code: "XX000", message: "fail" };
  const result = await createPromotionAttributionCapture({
    promotionId: PROMOTION_ID,
    landingLocale: "ru",
    utm: { utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null },
    referrerHost: null,
  });
  assert.equal(result.ok, false);
  assert.equal("cookieToken" in result, false);
});
