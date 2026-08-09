import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildAdminMarkPaidBody,
  buildCreditApplyBody,
  buildPayoutRequestBody,
  canApplyCreditToCommission,
  canRequestPayoutForCommission,
  canUseFinancialActions,
  centsToEuroInput,
  creditErrorLocaleKey,
  euroInputToCents,
  payoutErrorLocaleKey,
  payoutStatusLocaleKey,
  validateCreditAmountCents,
} from "./partnerDashboardUi.ts";

const approvedSpendable = {
  public_ref: "FR-P-ABCD",
  amount_cents: 2900,
  currency: "EUR",
  status: "approved",
  earned_at: "2026-01-01T00:00:00.000Z",
  credited_cents: 900,
  paid_out_cents: 0,
  available_cents: 2000,
  payout_reserved: false,
};

test("E: approved spendable commission shows credit eligibility", () => {
  assert.equal(canApplyCreditToCommission(approvedSpendable, "full"), true);
  assert.equal(canRequestPayoutForCommission(approvedSpendable, "full"), true);
});

test("F: pending/reversed do not show credit eligibility", () => {
  assert.equal(
    canApplyCreditToCommission({ ...approvedSpendable, status: "pending", available_cents: 2900 }, "full"),
    false
  );
  assert.equal(
    canApplyCreditToCommission({ ...approvedSpendable, status: "reversed", available_cents: 2900 }, "full"),
    false
  );
});

test("G: payout-reserved commission shows no credit eligibility", () => {
  assert.equal(
    canApplyCreditToCommission(
      { ...approvedSpendable, payout_reserved: true, available_cents: 0 },
      "full"
    ),
    false
  );
});

test("H: partial available amount helper", () => {
  assert.equal(approvedSpendable.available_cents, 2000);
  assert.equal(centsToEuroInput(2000), "20.00");
  assert.equal(euroInputToCents("20"), 2000);
});

test("I/J: credit submit body contains only allowed fields", () => {
  const body = buildCreditApplyBody({
    commissionRef: "FR-P-ABCD",
    amountCents: 500,
    idempotencyKey: "key-1",
  });
  assert.deepEqual(body, {
    commission_ref: "FR-P-ABCD",
    amount_cents: 500,
    idempotency_key: "key-1",
  });
  assert.equal("partner_id" in body, false);
});

test("N: payout request sends one public commission ref", () => {
  const body = buildPayoutRequestBody("FR-P-ABCD");
  assert.deepEqual(body, { commission_refs: ["FR-P-ABCD"] });
});

test("X: mark paid sends only optional admin fields", () => {
  assert.deepEqual(buildAdminMarkPaidBody({}), {});
  assert.deepEqual(buildAdminMarkPaidBody({ paymentReference: "SEPA-1" }), {
    payment_reference: "SEPA-1",
  });
  assert.deepEqual(
    buildAdminMarkPaidBody({ paymentReference: "SEPA-1", adminNote: "note" }),
    { payment_reference: "SEPA-1", admin_note: "note" }
  );
  assert.equal("amount_cents" in buildAdminMarkPaidBody({ paymentReference: "x" }), false);
});

test("P: payout history status locale keys", () => {
  assert.equal(payoutStatusLocaleKey("draft"), "partner.dashboard.payoutStatus.draft");
  assert.equal(payoutStatusLocaleKey("paid"), "partner.dashboard.payoutStatus.paid");
});

test("credit and payout error keys map to locale paths", () => {
  assert.match(creditErrorLocaleKey("commission_payout_reserved"), /payoutReserved/);
  assert.match(payoutErrorLocaleKey("not_authenticated"), /unauthorized/);
});

test("validateCreditAmountCents guards amount", () => {
  assert.equal(validateCreditAmountCents(500, 2000), "ok");
  assert.equal(validateCreditAmountCents(2500, 2000), "exceeds");
  assert.equal(validateCreditAmountCents(0, 2000), "invalid");
});

test("read_only access disables financial actions", () => {
  assert.equal(canUseFinancialActions("read_only"), false);
  assert.equal(canApplyCreditToCommission(approvedSpendable, "read_only"), false);
});

test("AA: PartnerDashboardClient hides Stripe Connect and legacy payout flag", () => {
  const src = readFileSync(
    new URL("../../components/partners/PartnerDashboardClient.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(src, /stripe-connect|Stripe Connect|payouts_enabled|cashPayoutPendingCta/i);
  assert.match(src, /buildCreditApplyBody/);
  assert.match(src, /buildPayoutRequestBody/);
  assert.match(src, /commission\.public_ref/);
  assert.doesNotMatch(src, /partner_id/);
  assert.match(src, /disabled=\{actionLoading\}/);
});

test("Q/R: dashboard renders public ref not internal commission UUID field", () => {
  const src = readFileSync(
    new URL("../../components/partners/PartnerDashboardClient.tsx", import.meta.url),
    "utf8"
  );
  assert.match(src, /c\.public_ref/);
  assert.doesNotMatch(src, /c\.id/);
  assert.doesNotMatch(src, /specialist_id|stripe/i);
});

test("S/T/U/V/W: admin payout queue wiring", () => {
  const src = readFileSync(
    new URL("../../components/admin/AdminPartnerPayoutQueue.tsx", import.meta.url),
    "utf8"
  );
  assert.match(src, /adminHeaders|x-admin-token/);
  assert.match(src, /\/api\/admin\/partners\/payouts/);
  assert.match(src, /Mark ready/);
  assert.match(src, /Mark paid/);
  assert.match(src, /Cancel/);
  assert.match(src, /actual bank transfer/i);
  assert.doesNotMatch(src, /amount_cents.*input|edit amount/i);
});

test("AF: RU/UA/DE locale keys exist for R2 dashboard copy", () => {
  for (const file of ["ru.json", "ua.json", "de.json"]) {
    const raw = readFileSync(new URL(`../../locales/${file}`, import.meta.url), "utf8");
    for (const key of [
      "creditActionBtn",
      "payoutActionBtn",
      "payoutHistoryTitle",
      "payoutStatus",
      "manualPayoutExplainer",
      "errors",
    ]) {
      assert.match(raw, new RegExp(`"${key}"`));
    }
  }
});

test("AB: dashboard amount module present", () => {
  const src = readFileSync(new URL("./dashboardAmounts.ts", import.meta.url), "utf8");
  assert.match(src, /computeDashboardAmounts/);
  assert.match(src, /spendableCommissionCents/);
});
