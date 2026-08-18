import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { findUntrustedCheckoutBodyKeys } from "./checkoutBodyValidation.ts";
import { GRACE_PERIOD_DAYS } from "./specialistAccessLifecycle.ts";

const checkoutRoute = readFileSync(
  new URL("../../app/api/billing/checkout/route.ts", import.meta.url),
  "utf8",
);
const historyRoute = readFileSync(
  new URL("../../app/api/billing/history/route.ts", import.meta.url),
  "utf8",
);
const plansRoute = readFileSync(
  new URL("../../app/api/billing/plans/route.ts", import.meta.url),
  "utf8",
);
const bounceRoute = readFileSync(
  new URL("../../app/api/billing/checkout-return/route.ts", import.meta.url),
  "utf8",
);
const createCheckout = readFileSync(new URL("./createCheckoutSession.ts", import.meta.url), "utf8");
const createPlanPayment = readFileSync(
  new URL("./createPlanPaymentCheckout.ts", import.meta.url),
  "utf8",
);

test("checkout uses bearer-first cookie-compatible specialist session", () => {
  assert.match(checkoutRoute, /resolveSpecialistLeadSession/);
  assert.match(checkoutRoute, /specialistLeadSessionErrorCode/);
  assert.match(checkoutRoute, /status: specialistLeadSessionErrorStatus/);
  assert.match(checkoutRoute, /session\.specialistId/);
  assert.match(checkoutRoute, /session\.userId/);
  assert.doesNotMatch(checkoutRoute, /bodyRecord\.specialist_id/);
});

test("checkout keeps untrusted URL and amount fields rejected", () => {
  const keys = findUntrustedCheckoutBodyKeys({
    plan_code: "basic",
    success_url: "https://evil.example/ok",
    cancel_url: "https://evil.example/no",
    redirect_url: "https://evil.example",
    amount: 1,
    price_id: "price_evil",
    specialist_id: "other-spec",
  });
  assert.ok(keys.includes("success_url"));
  assert.ok(keys.includes("cancel_url"));
  assert.ok(keys.includes("redirect_url"));
  assert.ok(keys.includes("amount"));
  assert.ok(keys.includes("price_id"));
  assert.ok(keys.includes("specialist_id"));
  assert.equal(findUntrustedCheckoutBodyKeys({ plan_code: "basic", return_target: "native" }).length, 0);
});

test("checkout validates return_target server-side", () => {
  assert.match(checkoutRoute, /parseCheckoutReturnTarget/);
  assert.match(checkoutRoute, /invalid_return_target/);
  assert.match(createCheckout, /returnTarget/);
  assert.match(createPlanPayment, /returnTarget/);
});

test("plan catalog route is read-only and uses listPublicCommercialPlans", () => {
  assert.match(plansRoute, /listPublicCommercialPlans/);
  assert.match(plansRoute, /export async function GET/);
  assert.doesNotMatch(plansRoute, /export async function POST/);
  assert.doesNotMatch(plansRoute, /PLAN_PAYMENT_GROSS_CENTS/);
});

test("billing history is specialist-owned and does not take client specialist_id", () => {
  assert.match(historyRoute, /resolveSpecialistLeadSession/);
  assert.match(historyRoute, /\.eq\("specialist_id", session\.specialistId\)/);
  assert.doesNotMatch(historyRoute, /searchParams\.get\(["']specialist/);
  assert.doesNotMatch(historyRoute, /searchParams\.get\(["']user/);
  assert.match(historyRoute, /mapPlanPaymentHistoryItems/);
});

test("native bounce is enum-only and redirects to the app scheme", () => {
  assert.match(bounceRoute, /target !== "native"/);
  assert.match(bounceRoute, /buildNativeBillingDeepLink/);
  assert.match(bounceRoute, /parsePaidPlanCode/);
  assert.match(bounceRoute, /invalid_return/);
  assert.doesNotMatch(bounceRoute, /searchParams\.get\(["']success_url/);
});

test("manual one-time checkout and 7-day grace remain canonical", () => {
  assert.match(createPlanPayment, /mode: "payment"/);
  assert.equal(GRACE_PERIOD_DAYS, 7);
  assert.match(createCheckout, /parsePaidPlanCode/);
});

test("no specialist invoice document endpoint is shipped", () => {
  const invoicePath = fileURLToPath(
    new URL("../../app/api/billing/history/[id]/invoice/route.ts", import.meta.url),
  );
  assert.equal(existsSync(invoicePath), false);
});
