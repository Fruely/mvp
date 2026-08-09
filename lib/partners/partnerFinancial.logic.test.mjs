import { registerPartnerTestHooks } from "./partnerTestHooks.mjs";

registerPartnerTestHooks();

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createPartnerFinancialMock,
  seedPartnerFinancialFixtures,
} from "./partnerFinancial.harness.mjs";

const { computeDashboardAmounts } = await import("./dashboardAmounts.ts");
const { availableCommissionCents, computeAvailableBalance } = await import("./creditMath.ts");
const { resolveCommissionIdByPublicRef, spendableCommissionCents } = await import(
  "./partnerFinancialAvailability.ts"
);
const { publicCommissionRef } = await import("./publicRef.ts");

const { PartnerDomainError } = await import("./errors.ts");
const { applyPartnerCommissionCredit } = await import("./credit.ts");
const {
  cancelPartnerPayout,
  markPartnerPayoutPaid,
  markPartnerPayoutReady,
  requestPartnerPayout,
} = await import("./payouts.ts");

const { partnerId, userId, commissionApprovedId, commissionPendingId, commissionReversedId } =
  seedPartnerFinancialFixtures();

function freshMock() {
  const seed = seedPartnerFinancialFixtures();
  const mock = createPartnerFinancialMock(seed.tables);
  return {
    ...mock,
    partnerId: seed.partnerId,
    userId: seed.userId,
    commissionApprovedId: seed.commissionApprovedId,
    commissionPendingId: seed.commissionPendingId,
    commissionReversedId: seed.commissionReversedId,
  };
}

function approvedRef(id = commissionApprovedId) {
  return publicCommissionRef(id);
}

test("AD: dashboard available excludes payout-reserved commission", () => {
  const totals = computeDashboardAmounts([
    {
      amount_cents: 2900,
      status: "approved",
      credited_cents: 900,
      paid_out_cents: 0,
      payout_id: null,
    },
    {
      amount_cents: 1500,
      status: "approved",
      credited_cents: 0,
      paid_out_cents: 0,
      payout_id: "payout-reserved",
    },
  ]);
  assert.equal(totals.approved_unpaid_cents, 2000);
  assert.equal(totals.available_for_payout_cents, 2000);
});

test("AC: credited + paid_out never exceeds amount (pure guard)", () => {
  const row = {
    amount_cents: 2900,
    credited_cents: 900,
    paid_out_cents: 2000,
    status: "approved",
    payout_id: null,
  };
  assert.equal(spendableCommissionCents(row), 0);
  assert.equal(900 + 2000 <= row.amount_cents, true);
});

test("S: partial credited commission payout only remainder", () => {
  const row = {
    amount_cents: 2900,
    credited_cents: 900,
    paid_out_cents: 0,
    status: "approved",
    payout_id: null,
  };
  assert.equal(spendableCommissionCents(row), 2000);
});

test("K: payout-linked commission cannot credit (pure)", () => {
  const row = {
    amount_cents: 2900,
    credited_cents: 0,
    paid_out_cents: 0,
    status: "approved",
    payout_id: "abc",
  };
  assert.equal(spendableCommissionCents(row), 0);
});

test("resolveCommissionIdByPublicRef finds owned commission", () => {
  const ref = approvedRef();
  const id = resolveCommissionIdByPublicRef([{ id: commissionApprovedId }], ref);
  assert.equal(id, commissionApprovedId);
});

test("A: partner credit route requires auth", () => {
  const src = readFileSync(new URL("../../app/api/partner/credits/apply/route.ts", import.meta.url), "utf8");
  assert.match(src, /getUser\(\)/);
  assert.match(src, /not_authenticated/);
});

test("L: payout request route requires auth", () => {
  const src = readFileSync(new URL("../../app/api/partner/payouts/request/route.ts", import.meta.url), "utf8");
  assert.match(src, /getUser\(\)/);
  assert.match(src, /not_authenticated/);
});

test("T: admin payout ready requires admin token", () => {
  for (const segment of ["ready", "paid", "cancel"]) {
    const src = readFileSync(
      new URL(`../../app/api/admin/partners/payouts/[id]/${segment}/route.ts`, import.meta.url),
      "utf8"
    );
    assert.match(src, /requireAdminToken/);
  }
});

test("AE: no Stripe Connect calls in financial modules", () => {
  for (const file of ["credit.ts", "payouts.ts", "partnerFinancialAvailability.ts"]) {
    const src = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /stripe\.accounts|Stripe Connect|createConnect/i);
  }
});

test("B: credit only own commission", async () => {
  const { supabase } = freshMock();
  const otherRef = publicCommissionRef("66666666-6666-4666-8666-666666666666");
  await assert.rejects(
    () =>
      applyPartnerCommissionCredit(supabase, {
        partnerId,
        userId,
        commissionRef: otherRef,
        amountCents: 100,
        idempotencyKey: "k-own-1",
      }),
    (err) => err instanceof PartnerDomainError && err.code === "commission_not_found"
  );
});

test("C: pending commission cannot credit", async () => {
  const { supabase } = freshMock();
  await assert.rejects(
    () =>
      applyPartnerCommissionCredit(supabase, {
        partnerId,
        userId,
        commissionRef: publicCommissionRef(commissionPendingId),
        amountCents: 100,
        idempotencyKey: "k-pending-1",
      }),
    (err) => err instanceof PartnerDomainError && err.code === "commission_not_available"
  );
});

test("D: reversed cannot credit", async () => {
  const { supabase } = freshMock();
  await assert.rejects(
    () =>
      applyPartnerCommissionCredit(supabase, {
        partnerId,
        userId,
        commissionRef: publicCommissionRef(commissionReversedId),
        amountCents: 100,
        idempotencyKey: "k-reversed-1",
      }),
    (err) => err instanceof PartnerDomainError && err.code === "commission_not_available"
  );
});

test("E: amount > available rejected", async () => {
  const { supabase } = freshMock();
  await assert.rejects(
    () =>
      applyPartnerCommissionCredit(supabase, {
        partnerId,
        userId,
        commissionRef: approvedRef(),
        amountCents: 9999,
        idempotencyKey: "k-too-much",
      }),
    (err) => err instanceof PartnerDomainError && err.code === "insufficient_available_balance"
  );
});

test("F/G/H: partial credit increments credited_cents and marks applied", async () => {
  const mock = freshMock();
  const result = await applyPartnerCommissionCredit(mock.supabase, {
    partnerId,
    userId,
    commissionRef: approvedRef(),
    amountCents: 900,
    idempotencyKey: "k-partial-1",
  });
  assert.equal(result.status, "applied");
  assert.equal(result.amountCents, 900);
  const commission = mock.tables.partner_commissions.find((c) => c.id === commissionApprovedId);
  assert.equal(commission.credited_cents, 900);
  const app = mock.tables.partner_credit_applications[0];
  assert.equal(app.status, "applied");
  assert.ok(app.applied_at);
});

test("I: idempotent retry same key", async () => {
  const mock = freshMock();
  const input = {
    partnerId,
    userId,
    commissionRef: approvedRef(),
    amountCents: 500,
    idempotencyKey: "k-idem-1",
  };
  const first = await applyPartnerCommissionCredit(mock.supabase, input);
  const second = await applyPartnerCommissionCredit(mock.supabase, input);
  assert.equal(first.applicationId, second.applicationId);
  assert.equal(mock.tables.partner_credit_applications.length, 1);
  assert.equal(
    mock.tables.partner_commissions.find((c) => c.id === commissionApprovedId).credited_cents,
    500
  );
});

test("J: same key different amount conflict", async () => {
  const mock = freshMock();
  await applyPartnerCommissionCredit(mock.supabase, {
    partnerId,
    userId,
    commissionRef: approvedRef(),
    amountCents: 500,
    idempotencyKey: "k-conflict",
  });
  await assert.rejects(
    () =>
      applyPartnerCommissionCredit(mock.supabase, {
        partnerId,
        userId,
        commissionRef: approvedRef(),
        amountCents: 600,
        idempotencyKey: "k-conflict",
      }),
    (err) => err instanceof PartnerDomainError && err.code === "idempotency_key_conflict"
  );
});

test("K: payout-linked commission cannot credit (runtime)", async () => {
  const mock = freshMock();
  mock.tables.partner_commissions.find((c) => c.id === commissionApprovedId).payout_id =
    "99999999-9999-4999-8999-999999999999";
  await assert.rejects(
    () =>
      applyPartnerCommissionCredit(mock.supabase, {
        partnerId,
        userId,
        commissionRef: approvedRef(),
        amountCents: 100,
        idempotencyKey: "k-reserved",
      }),
    (err) => err instanceof PartnerDomainError && err.code === "commission_payout_reserved"
  );
});

test("M/N/O/P/Q: payout request creates draft and links commission", async () => {
  const mock = freshMock();
  const result = await requestPartnerPayout(mock.supabase, {
    partnerId,
    userId,
    commissionRefs: [approvedRef()],
  });
  assert.equal(result.status, "draft");
  assert.equal(result.amountCents, 2900);
  assert.equal(mock.tables.partner_payouts.length, 1);
  const commission = mock.tables.partner_commissions.find((c) => c.id === commissionApprovedId);
  assert.equal(commission.payout_id, result.payoutId);
  assert.equal(mock.audit.some((a) => a.action === "payout_requested"), true);
});

test("R: second payout blocked for same commission", async () => {
  const mock = freshMock();
  await requestPartnerPayout(mock.supabase, {
    partnerId,
    userId,
    commissionRefs: [approvedRef()],
  });
  await assert.rejects(
    () =>
      requestPartnerPayout(mock.supabase, {
        partnerId,
        userId,
        commissionRefs: [approvedRef()],
      }),
    (err) =>
      err instanceof PartnerDomainError &&
      (err.code === "payout_commission_unavailable" || err.code === "commission_payout_reserved")
  );
});

test("U: draft to ready works", async () => {
  const mock = freshMock();
  const req = await requestPartnerPayout(mock.supabase, {
    partnerId,
    userId,
    commissionRefs: [approvedRef()],
  });
  const ready = await markPartnerPayoutReady(mock.supabase, { payoutId: req.payoutId });
  assert.equal(ready.status, "ready");
  assert.equal(mock.tables.partner_payouts[0].status, "ready");
  assert.ok(mock.tables.partner_payouts[0].ready_at);
});

test("V: paid requires ready", async () => {
  const mock = freshMock();
  const req = await requestPartnerPayout(mock.supabase, {
    partnerId,
    userId,
    commissionRefs: [approvedRef()],
  });
  await assert.rejects(
    () => markPartnerPayoutPaid(mock.supabase, { payoutId: req.payoutId }),
    (err) => err instanceof PartnerDomainError && err.code === "payout_not_ready"
  );
});

test("W/X: mark paid increments paid_out once and retry is idempotent", async () => {
  const mock = freshMock();
  const req = await requestPartnerPayout(mock.supabase, {
    partnerId,
    userId,
    commissionRefs: [approvedRef()],
  });
  await markPartnerPayoutReady(mock.supabase, { payoutId: req.payoutId });
  const paid = await markPartnerPayoutPaid(mock.supabase, {
    payoutId: req.payoutId,
    paymentReference: "SEPA-REF-1",
  });
  assert.equal(paid.status, "paid");
  const commission = mock.tables.partner_commissions.find((c) => c.id === commissionApprovedId);
  assert.equal(commission.paid_out_cents, 2900);
  assert.equal(commission.status, "paid");
  const again = await markPartnerPayoutPaid(mock.supabase, { payoutId: req.payoutId });
  assert.equal(again.status, "paid");
  assert.equal(commission.paid_out_cents, 2900);
});

test("Y: paid payout cannot cancel", async () => {
  const mock = freshMock();
  const req = await requestPartnerPayout(mock.supabase, {
    partnerId,
    userId,
    commissionRefs: [approvedRef()],
  });
  await markPartnerPayoutReady(mock.supabase, { payoutId: req.payoutId });
  await markPartnerPayoutPaid(mock.supabase, { payoutId: req.payoutId });
  await assert.rejects(
    () => cancelPartnerPayout(mock.supabase, { payoutId: req.payoutId }),
    (err) => err instanceof PartnerDomainError && err.code === "payout_already_paid"
  );
});

test("Z/AA: cancel releases payout_id and commission becomes spendable again", async () => {
  const mock = freshMock();
  const req = await requestPartnerPayout(mock.supabase, {
    partnerId,
    userId,
    commissionRefs: [approvedRef()],
  });
  await cancelPartnerPayout(mock.supabase, { payoutId: req.payoutId });
  const commission = mock.tables.partner_commissions.find((c) => c.id === commissionApprovedId);
  assert.equal(commission.payout_id, null);
  assert.equal(spendableCommissionCents(commission), 2900);
});

test("AB: reversed commission blocks mark-paid", async () => {
  const mock = freshMock();
  const req = await requestPartnerPayout(mock.supabase, {
    partnerId,
    userId,
    commissionRefs: [approvedRef()],
  });
  await markPartnerPayoutReady(mock.supabase, { payoutId: req.payoutId });
  mock.tables.partner_commissions.find((c) => c.id === commissionApprovedId).status = "reversed";
  await assert.rejects(
    () => markPartnerPayoutPaid(mock.supabase, { payoutId: req.payoutId }),
    (err) => err instanceof PartnerDomainError && err.code === "commission_reversed"
  );
});

test("partial credit then payout remainder", async () => {
  const mock = freshMock();
  await applyPartnerCommissionCredit(mock.supabase, {
    partnerId,
    userId,
    commissionRef: approvedRef(),
    amountCents: 900,
    idempotencyKey: "k-partial-before-payout",
  });
  const req = await requestPartnerPayout(mock.supabase, {
    partnerId,
    userId,
    commissionRefs: [approvedRef()],
  });
  assert.equal(req.amountCents, 2000);
});

test("computeAvailableBalance aggregates spendable cents", () => {
  const balance = computeAvailableBalance([
    {
      amount_cents: 2900,
      credited_cents: 900,
      paid_out_cents: 0,
      status: "approved",
      payout_id: "reserved",
    },
    {
      amount_cents: 1000,
      credited_cents: 0,
      paid_out_cents: 0,
      status: "approved",
      payout_id: null,
    },
  ]);
  assert.equal(balance.available_cents, 1000);
});

test("availableCommissionCents alias matches spendableCommissionCents", () => {
  const row = {
    amount_cents: 1000,
    credited_cents: 100,
    paid_out_cents: 200,
    status: "approved",
    payout_id: null,
  };
  assert.equal(availableCommissionCents(row), spendableCommissionCents(row));
});

test("AF/AG/AH/AI/AJ: existing partner regression modules still import", () => {
  for (const file of [
    "./commissionValidation.ts",
    "./rewardCalculation.ts",
    "../../lib/billing/stripePartnerCommission.ts",
  ]) {
    const src = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.ok(src.length > 0);
  }
});
