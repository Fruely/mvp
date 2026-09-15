import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const creatorPath = fileURLToPath(
  new URL("./createRequestOfferCheckout.ts", import.meta.url),
);
const readinessPath = fileURLToPath(
  new URL("./requestOfferCheckoutReadiness.ts", import.meta.url),
);
const routePath = fileURLToPath(
  new URL("../../app/api/billing/request-offers/checkout/route.ts", import.meta.url),
);

test("direct offer checkout stays behind explicit feature readiness", async () => {
  const src = await readFile(readinessPath, "utf8");
  assert.match(src, /isDirectLeadPplCheckoutEnabled/);
  assert.match(src, /STRIPE_SECRET_KEY/);
  assert.match(src, /NEXT_PUBLIC_SITE_URL/);
});

test("route accepts no client-authoritative price or specialist identity", async () => {
  const src = await readFile(routePath, "utf8");
  assert.match(src, /ALLOWED_BODY_KEYS = new Set\(\["offer_id", "lang"\]\)/);
  assert.doesNotMatch(src, /price_cents/);
  assert.doesNotMatch(src, /amount_cents/);
  assert.doesNotMatch(src, /specialist_id/);
  assert.match(src, /\.eq\("user_id", user\.id\)/);
});

test("creator resolves price from server offer and blocks subscription double-charge", async () => {
  const src = await readFile(creatorPath, "utf8");
  assert.match(src, /\.eq\("specialist_id", input\.specialistId\)/);
  assert.match(src, /resolveDirectLeadPurchasePrice\(offer\)/);
  assert.match(src, /effectivePaidPlan !== null/);
  assert.match(src, /request_offer_access_grants/);
  assert.match(src, /request_offer_payments/);
  assert.match(src, /stripe\.checkout\.sessions\.create/);
  assert.doesNotMatch(src, /input\.price/i);
  assert.doesNotMatch(src, /input\.amount/i);
});

test("success redirect is not treated as payment entitlement", async () => {
  const src = await readFile(creatorPath, "utf8");
  assert.match(src, /status: "pending"/);
  assert.doesNotMatch(src, /request_offer_access_grants"\)\.insert/);
  assert.doesNotMatch(src, /status: "paid"/);
});
