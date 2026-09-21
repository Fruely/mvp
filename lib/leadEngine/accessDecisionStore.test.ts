import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const storePath = fileURLToPath(new URL("./accessDecisionStore.ts", import.meta.url));
const offersPath = fileURLToPath(new URL("./requestOffers.ts", import.meta.url));
const policyPath = fileURLToPath(new URL("./accessDecision.ts", import.meta.url));
const shadowPath = fileURLToPath(new URL("./shadowPricing.ts", import.meta.url));

test("direct PPL adapter is read-only and uses grants as payment entitlement proof", async () => {
  const storeSrc = await readFile(storePath, "utf8");
  assert.match(storeSrc, /request_offer_access_grants/);
  assert.match(storeSrc, /request_offer_payments/);
  assert.match(storeSrc, /\.is\("revoked_at", null\)/);
  assert.match(storeSrc, /\.eq\("status", "pending"\)/);
  assert.match(storeSrc, /\.gte\("created_at", directPplPendingCutoffIso\(\)\)/);
  assert.match(storeSrc, /paidEntitlement = Boolean\(grant\?\.id\)/);
  assert.match(storeSrc, /paymentProcessing = Boolean\(pendingPayment\?\.id\)/);
  assert.doesNotMatch(storeSrc, /stripe/i);
  assert.doesNotMatch(storeSrc, /\.update\(/);
  assert.doesNotMatch(storeSrc, /\.insert\(/);
  assert.doesNotMatch(storeSrc, /checkout\.sessions/i);
  assert.doesNotMatch(storeSrc, /createPromotedAccessCheckout/);
});

test("shadow offer writer still keeps live price_cents null", async () => {
  const offersSrc = await readFile(offersPath, "utf8");
  assert.match(offersSrc, /update\(buildShadowPricingSnapshot\(resolved\)\)/);
  assert.match(offersSrc, /\.is\("shadow_priced_at", null\)/);
  assert.doesNotMatch(offersSrc, /price_cents:\s*resolved/);
});

test("access decision reuses canonical subscription entitlement", async () => {
  const src = await readFile(policyPath, "utf8");
  assert.match(src, /from "@\/lib\/billing\/contactUnlockEntitlement"/);
  assert.match(src, /canUnlockLeadContacts\(facts\.planStatus\)/);
  assert.doesNotMatch(src, /searchParams/);
  assert.doesNotMatch(src, /queryPaid/);
});

test("shadow pricing snapshot only writes shadow_* columns", async () => {
  const src = await readFile(shadowPath, "utf8");
  assert.match(src, /shadow_price_cents: resolved\.priceCents/);
  assert.match(src, /shadow_pricing_rule_id/);
  assert.match(src, /shadow_max_buyers/);
  assert.match(src, /shadow_priced_at/);
  assert.doesNotMatch(src, /^\s*price_cents:/m);
});
