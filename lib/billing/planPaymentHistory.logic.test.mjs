import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return {
        url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true,
      };
    }
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !specifier.endsWith(".ts") &&
      !specifier.endsWith(".mjs") &&
      !specifier.endsWith(".js") &&
      !specifier.endsWith(".cjs") &&
      !specifier.endsWith(".json")
    ) {
      return {
        url: new URL(`${specifier}.ts`, context.parentURL).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const { mapPlanPaymentHistoryItem, mapPlanPaymentHistoryItems } = await import(
  "./planPaymentHistory.ts"
);

test("maps owned payment history without Stripe internals or invoice documents", () => {
  const item = mapPlanPaymentHistoryItem({
    id: "pay-1",
    plan_code: "basic",
    status: "paid",
    provider: "stripe",
    currency: "eur",
    gross_amount_cents: 2900,
    discount_amount_cents: 0,
    net_amount_cents: 2900,
    period_months: 1,
    paid_at: "2026-08-18T10:00:00.000Z",
    created_at: "2026-08-18T09:00:00.000Z",
    period_end_at: "2026-09-18T10:00:00.000Z",
  });

  assert.deepEqual(item, {
    id: "pay-1",
    plan_code: "basic",
    status: "paid",
    provider: "stripe",
    currency: "eur",
    amount_cents: 2900,
    gross_amount_cents: 2900,
    discount_amount_cents: 0,
    period_months: 1,
    paid_at: "2026-08-18T10:00:00.000Z",
    created_at: "2026-08-18T09:00:00.000Z",
    period_end_at: "2026-09-18T10:00:00.000Z",
    invoice_available: false,
  });
  assert.equal(item && "stripe_checkout_session_id" in item, false);
});

test("empty and invalid rows do not synthesize history", () => {
  assert.deepEqual(mapPlanPaymentHistoryItems([]), []);
  assert.equal(
    mapPlanPaymentHistoryItem({
      id: "pay-starter",
      plan_code: "starter",
      status: "paid",
      provider: "stripe",
      currency: "eur",
      gross_amount_cents: 0,
      discount_amount_cents: 0,
      net_amount_cents: 0,
      period_months: 1,
      paid_at: null,
      created_at: "2026-08-18T09:00:00.000Z",
      period_end_at: null,
    }),
    null,
  );
});

test("specialist invoice document route does not exist", () => {
  const invoiceRoute = fileURLToPath(
    new URL("../../app/api/billing/history/[id]/invoice/route.ts", import.meta.url),
  );
  assert.equal(existsSync(invoiceRoute), false);
});
