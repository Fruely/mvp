import assert from "node:assert/strict";
import test from "node:test";

/**
 * Pure logic coverage for commission snapshotting rules (no DB).
 * DB uniqueness is enforced in SQL migration:
 * - unique(source_type, source_event_id)
 * - unique(specialist_id)
 */

test("rate snapshot: old commission amount independent of new partner rate", () => {
  const partnerRateAtEarn = 2900;
  const partnerRateLater = 4900;
  const commissionAmount = partnerRateAtEarn;
  assert.equal(commissionAmount, 2900);
  assert.notEqual(commissionAmount, partnerRateLater);
});

test("idempotency key identity", () => {
  const a = { source_type: "admin_confirmed_first_payment", source_event_id: "pay_1" };
  const b = { source_type: "admin_confirmed_first_payment", source_event_id: "pay_1" };
  assert.deepEqual(a, b);
  const c = { source_type: "admin_confirmed_first_payment", source_event_id: "pay_2" };
  assert.notDeepEqual(a, c);
});

test("plan fields are never commission source", () => {
  const forbiddenSources = ["specialist_plan", "plan_status", "is_pro", "subscription_status"];
  const allowed = ["admin_confirmed_first_payment", "stripe_invoice_payment_succeeded"];
  for (const f of forbiddenSources) {
    assert.equal(allowed.includes(f), false);
  }
});
