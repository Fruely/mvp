import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolvePartnerOnboarding } from "./onboarding.ts";
import { PARTNER_AGREEMENT_VERSION, partnerPayoutsEnabled } from "./featureFlags.ts";

test("agreement_pending when bound without contract", () => {
  const d = resolvePartnerOnboarding({
    user_id: "u1",
    status: "pending",
    contract_signed_at: null,
  });
  assert.equal(d.step, "agreement_pending");
  assert.equal(d.nextPath, "/partners/agreement");
  assert.equal(d.referralAllowed, false);
});

test("active referral allowed after agreement even if payouts disabled", () => {
  const d = resolvePartnerOnboarding(
    {
      user_id: "u1",
      status: "active",
      contract_signed_at: "2026-07-25T00:00:00.000Z",
    },
    { payoutsEnabled: false, stripeReady: false }
  );
  assert.equal(d.step, "active");
  assert.equal(d.referralAllowed, true);
  assert.equal(d.payoutsReady, false);
});

test("invited partner without user goes to claim", () => {
  const d = resolvePartnerOnboarding({
    user_id: null,
    status: "pending",
    contract_signed_at: null,
  });
  assert.equal(d.step, "invited");
  assert.equal(d.nextPath, "/partner/claim");
});

test("suspended and closed steps", () => {
  assert.equal(
    resolvePartnerOnboarding({
      user_id: "u1",
      status: "paused",
      contract_signed_at: "2026-07-25T00:00:00.000Z",
    }).step,
    "suspended"
  );
  assert.equal(
    resolvePartnerOnboarding({
      user_id: "u1",
      status: "disabled",
      contract_signed_at: "2026-07-25T00:00:00.000Z",
    }).step,
    "closed"
  );
});

test("default payouts flag is disabled", () => {
  assert.equal(partnerPayoutsEnabled, false);
  assert.ok(PARTNER_AGREEMENT_VERSION.length > 0);
});

test("stripe connect adapter keeps payouts_disabled path", () => {
  const src = readFileSync(new URL("./stripeConnect.ts", import.meta.url), "utf8");
  assert.match(src, /payouts_disabled/);
  assert.match(src, /partnerPayoutsEnabled/);
  assert.match(src, /startStripeConnectOnboarding/);
});
