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
const materializePath = fileURLToPath(
  new URL("../leadEngine/materializeDirectPplOffer.ts", import.meta.url),
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

test("creator blocks subscription double-charge before PPL materialization", async () => {
  const src = await readFile(creatorPath, "utf8");
  assert.match(src, /effectivePaidPlan !== null/);
  assert.match(src, /materializeDirectPplOffer/);
  assert.ok(
    src.indexOf("effectivePaidPlan !== null") <
      src.indexOf("materializeDirectPplOffer(input.supabase"),
  );
  assert.match(src, /request_offer_access_grants/);
  assert.match(src, /request_offer_payments/);
  assert.match(src, /stripe\.checkout\.sessions\.create/);
  assert.doesNotMatch(src, /input\.price/i);
  assert.doesNotMatch(src, /input\.amount/i);
});

test("materialization copies shadow snapshot into immutable live commercial fields", async () => {
  const src = await readFile(materializePath, "utf8");
  assert.match(src, /shadow_price_cents/);
  assert.match(src, /shadow_pricing_rule_id/);
  assert.match(src, /shadow_max_buyers/);
  assert.match(src, /shadow_priced_at/);
  assert.match(src, /billing_model: "pay_per_lead"/);
  assert.match(src, /price_cents: shadowPrice/);
  assert.match(src, /pricing_rule_id: offer\.shadow_pricing_rule_id/);
  assert.match(src, /max_buyers_snapshot: shadowMaxBuyers/);
  assert.match(src, /\.eq\("billing_model", "subscription"\)/);
  assert.match(src, /\.is\("price_cents", null\)/);
});

test("success redirect is not treated as payment entitlement", async () => {
  const src = await readFile(creatorPath, "utf8");
  assert.match(src, /status: "pending"/);
  assert.doesNotMatch(src, /request_offer_access_grants"\)\.insert/);
  assert.doesNotMatch(src, /status: "paid"/);
});
