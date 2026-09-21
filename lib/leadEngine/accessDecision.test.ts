import assert from "node:assert/strict";
import test from "node:test";

import { canUnlockLeadContacts } from "@/lib/billing/contactUnlockEntitlement";
import {
  canRealizeDirectLeadContactUnlock,
  directPplPendingCutoffIso,
  isDirectLeadPplCheckoutEnabled,
  mapDirectLeadOfferRow,
  resolveDirectLeadAccessDecision,
  resolveDirectLeadPurchasePrice,
  type DirectLeadAccessFacts,
} from "@/lib/leadEngine/accessDecision";

const LEAD_ID = "11111111-1111-1111-1111-111111111111";
const SPECIALIST_ID = "22222222-2222-2222-2222-222222222222";
const OFFER_ID = "33333333-3333-3333-3333-333333333333";

function facts(
  overrides: Partial<DirectLeadAccessFacts> = {},
): DirectLeadAccessFacts {
  return {
    leadId: LEAD_ID,
    specialistId: SPECIALIST_ID,
    planStatus: "inactive",
    contactsUnlocked: false,
    paidEntitlement: false,
    paymentProcessing: false,
    offer: {
      id: OFFER_ID,
      status: "offered",
      priceCents: null,
      currency: "eur",
      shadowPriceCents: 6000,
    },
    directPplCheckoutEnabled: false,
    ...overrides,
  };
}

test("active subscription -> unlocked/source subscription", () => {
  const decision = resolveDirectLeadAccessDecision(
    facts({ planStatus: "active" }),
  );
  assert.deepEqual(decision, { state: "unlocked", source: "subscription" });
  assert.equal(canRealizeDirectLeadContactUnlock(decision), true);
  assert.equal(canUnlockLeadContacts("active"), true);
});

test("grace subscription preserves current production unlock entitlement", () => {
  const decision = resolveDirectLeadAccessDecision(
    facts({ planStatus: "grace" }),
  );
  assert.deepEqual(decision, { state: "unlocked", source: "subscription" });
  assert.equal(canUnlockLeadContacts("grace"), true);
});

test("inactive subscription + no payment -> locked", () => {
  const decision = resolveDirectLeadAccessDecision(facts());
  assert.equal(decision.state, "locked");
  if (decision.state !== "locked" || decision.canPurchase) {
    throw new Error("expected locked without purchase");
  }
  assert.equal(decision.reason, "direct_ppl_disabled");
  assert.equal(decision.offerId, OFFER_ID);
  assert.equal(decision.priceCents, 6000);
  assert.equal(decision.currency, "eur");
  assert.equal(canRealizeDirectLeadContactUnlock(decision), false);
});

test("inactive subscription + valid payment/grant -> unlocked/payment", () => {
  const decision = resolveDirectLeadAccessDecision(
    facts({ paidEntitlement: true }),
  );
  assert.deepEqual(decision, { state: "unlocked", source: "payment" });
});

test("shadow price itself is not entitlement", () => {
  const decision = resolveDirectLeadAccessDecision(
    facts({
      planStatus: "inactive",
      contactsUnlocked: false,
      paidEntitlement: false,
      offer: {
        id: OFFER_ID,
        status: "offered",
        priceCents: null,
        currency: "eur",
        shadowPriceCents: 6000,
      },
    }),
  );
  assert.notEqual(decision.state, "unlocked");
  assert.equal(canRealizeDirectLeadContactUnlock(decision), false);
});

test("client/query param claims cannot unlock contact", () => {
  const poisoned = {
    ...facts({ planStatus: "inactive" }),
    queryPaid: "1",
    clientUnlocked: true,
    paid: true,
    unlocked: true,
    searchParams: { paid: "true", unlock: "1" },
  } as DirectLeadAccessFacts;

  const decision = resolveDirectLeadAccessDecision(poisoned);
  assert.notEqual(decision.state, "unlocked");
  assert.equal(canRealizeDirectLeadContactUnlock(decision), false);
});

test("missing/unknown plan status preserves current production semantics", () => {
  assert.equal(canUnlockLeadContacts(null), true);
  assert.equal(canUnlockLeadContacts(undefined), true);
  assert.equal(canUnlockLeadContacts("unknown"), true);

  assert.deepEqual(
    resolveDirectLeadAccessDecision(facts({ planStatus: null })),
    { state: "unlocked", source: "subscription" },
  );
  assert.deepEqual(
    resolveDirectLeadAccessDecision(facts({ planStatus: undefined })),
    { state: "unlocked", source: "subscription" },
  );
  assert.deepEqual(
    resolveDirectLeadAccessDecision(facts({ planStatus: "unknown" })),
    { state: "unlocked", source: "subscription" },
  );
});

test("already-unlocked contact is existing_unlock when persisted source is unknown", () => {
  const decision = resolveDirectLeadAccessDecision(
    facts({
      planStatus: "inactive",
      contactsUnlocked: true,
      paidEntitlement: false,
    }),
  );
  assert.deepEqual(decision, { state: "unlocked", source: "existing_unlock" });
});

test("already-unlocked contact does not infer source from current plan status", () => {
  const decision = resolveDirectLeadAccessDecision(
    facts({
      planStatus: "active",
      contactsUnlocked: true,
      paidEntitlement: false,
    }),
  );
  assert.deepEqual(decision, { state: "unlocked", source: "existing_unlock" });
});

test("processing payment is not contact entitlement", () => {
  const decision = resolveDirectLeadAccessDecision(
    facts({
      planStatus: "inactive",
      paymentProcessing: true,
    }),
  );
  assert.deepEqual(decision, { state: "processing", offerId: OFFER_ID });
  assert.equal(canRealizeDirectLeadContactUnlock(decision), false);
});

test("active subscription + paymentProcessing=true => unlocked/subscription", () => {
  const decision = resolveDirectLeadAccessDecision(
    facts({
      planStatus: "active",
      paymentProcessing: true,
    }),
  );
  assert.deepEqual(decision, { state: "unlocked", source: "subscription" });
});

test("grace and missing plan still unlock over payment processing", () => {
  assert.deepEqual(
    resolveDirectLeadAccessDecision(
      facts({ planStatus: "grace", paymentProcessing: true }),
    ),
    { state: "unlocked", source: "subscription" },
  );
  assert.deepEqual(
    resolveDirectLeadAccessDecision(
      facts({ planStatus: null, paymentProcessing: true }),
    ),
    { state: "unlocked", source: "subscription" },
  );
});

test("direct PPL checkout remains locked until the feature flag is on", () => {
  const disabled = resolveDirectLeadAccessDecision(
    facts({ directPplCheckoutEnabled: false }),
  );
  assert.equal(disabled.state, "locked");
  if (disabled.state !== "locked") throw new Error("expected locked");
  assert.equal(disabled.canPurchase, false);

  const enabled = resolveDirectLeadAccessDecision(
    facts({ directPplCheckoutEnabled: true }),
  );
  assert.deepEqual(enabled, {
    state: "locked",
    canPurchase: true,
    priceCents: 6000,
    currency: "eur",
    offerId: OFFER_ID,
  });
  assert.equal(canRealizeDirectLeadContactUnlock(enabled), false);
});

test("dynamic shadow snapshot does not become live price_cents", () => {
  const offer = mapDirectLeadOfferRow({
    id: OFFER_ID,
    status: "offered",
    price_cents: null,
    currency: "eur",
    shadow_price_cents: 6000,
  });
  assert.equal(offer?.priceCents, null);
  assert.equal(offer?.shadowPriceCents, 6000);

  const purchase = resolveDirectLeadPurchasePrice(offer);
  assert.deepEqual(purchase, {
    priceCents: 6000,
    currency: "eur",
    source: "shadow",
  });
  assert.notEqual(purchase?.source, "live");
});

test("confirmed coaches shadow snapshot stays €60 observational", () => {
  const decision = resolveDirectLeadAccessDecision(
    facts({
      planStatus: "inactive",
      offer: {
        id: OFFER_ID,
        status: "offered",
        priceCents: null,
        currency: "eur",
        shadowPriceCents: 6000,
      },
    }),
  );
  assert.equal(decision.state, "locked");
  if (decision.state !== "locked" || decision.canPurchase) {
    throw new Error("expected locked without purchase");
  }
  assert.equal(decision.priceCents, 6000);
});

test("checkout env flag is off unless explicitly true", () => {
  assert.equal(isDirectLeadPplCheckoutEnabled({}), false);
  assert.equal(
    isDirectLeadPplCheckoutEnabled({
      LEAD_ENGINE_DIRECT_PPL_CHECKOUT_ENABLED: "false",
    }),
    false,
  );
  assert.equal(
    isDirectLeadPplCheckoutEnabled({
      LEAD_ENGINE_DIRECT_PPL_CHECKOUT_ENABLED: "true",
    }),
    true,
  );
});

test("missing identity is unavailable", () => {
  assert.deepEqual(
    resolveDirectLeadAccessDecision(facts({ leadId: null })),
    { state: "unavailable", reason: "missing_identity" },
  );
});


test("pending processing cutoff is 30 minutes before now", () => {
  const now = new Date("2026-09-21T10:00:00.000Z");
  assert.equal(
    directPplPendingCutoffIso(now),
    "2026-09-21T09:30:00.000Z",
  );
});
