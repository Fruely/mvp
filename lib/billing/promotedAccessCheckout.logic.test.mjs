import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { readFileSync } from "node:fs";

process.env.PAYMENTS_ENABLED = "true";
process.env.STRIPE_SECRET_KEY = "sk_test_x";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
process.env.NEXT_PUBLIC_SITE_URL = "https://freuly.de";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const map = {
      "@/lib/supabase/server": new URL("./testMocks/billing-service-server.mjs", import.meta.url).href,
      "@/lib/billing/stripeClient": new URL("./testMocks/stripe-client.mjs", import.meta.url).href,
      "server-only": new URL("../serviceRequests/testMocks/server-only.mjs", import.meta.url).href,
    };
    if (map[specifier]) return { url: map[specifier], shortCircuit: true };
    if (specifier.startsWith("@/")) {
      return {
        url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true,
      };
    }
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !specifier.endsWith(".ts") &&
      !specifier.endsWith(".mjs")
    ) {
      return {
        url: new URL(`${specifier}.ts`, context.parentURL).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const { findUntrustedPromotedAccessCheckoutBodyKeys } = await import(
  "./promotedAccessCheckoutBodyValidation.ts"
);
const {
  buildPromotedAccessPaymentIntentMetadata,
  buildPromotedAccessStripeMetadata,
} = await import("./createPromotedAccessCheckout.ts");
const {
  PROMOTED_ACCESS_AMOUNT_CENTS,
  PROMOTED_ACCESS_CURRENCY,
  PROMOTED_ACCESS_PURPOSE,
} = await import("./promotedAccessConstants.ts");
const { buildPromotedAccessCheckoutUrls } = await import("./promotedAccessUrls.ts");
const { getPromotedAccessCheckoutReadiness } = await import("./promotedAccessReadiness.ts");

const routeSrc = readFileSync(
  new URL("../../app/api/billing/promoted-access/checkout/route.ts", import.meta.url),
  "utf8",
);
const createSrc = readFileSync(
  new URL("./createPromotedAccessCheckout.ts", import.meta.url),
  "utf8",
);
const readinessSrc = readFileSync(
  new URL("./promotedAccessReadiness.ts", import.meta.url),
  "utf8",
);
const webhookSrc = readFileSync(
  new URL("../../app/api/billing/webhook/route.ts", import.meta.url),
  "utf8",
);

function withEnv(overrides, fn) {
  const saved = {};
  for (const [key, value] of Object.entries(overrides)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("A: route requires auth", () => {
  assert.match(routeSrc, /getUser\(\)/);
  assert.match(routeSrc, /error: "unauthorized"/);
  assert.match(routeSrc, /status: 401/);
});

test("B: current specialist resolved by auth user", () => {
  assert.match(routeSrc, /\.eq\("user_id", user\.id\)/);
});

test("C: blocked specialist rejected", () => {
  assert.match(routeSrc, /\.neq\("status", "blocked"\)/);
});

test("D-F: body allows only lang; extra fields rejected", () => {
  assert.match(routeSrc, /findUntrustedPromotedAccessCheckoutBodyKeys/);
  assert.match(routeSrc, /invalid_lang/);
  const keys = findUntrustedPromotedAccessCheckoutBodyKeys({ lang: "ru", promotion_id: "x" });
  assert.ok(keys.includes("promotion_id"));
});

test("G-L: client cannot supply promotion/specialist/amount/currency/price ids", () => {
  for (const key of [
    "promotion_id",
    "specialist_id",
    "amount",
    "currency",
    "price_id",
    "signup_binding_id",
  ]) {
    assert.ok(findUntrustedPromotedAccessCheckoutBodyKeys({ lang: "ru", [key]: "evil" }).includes(key));
  }
  assert.doesNotMatch(routeSrc, /body\?\.promotion_id/);
  assert.doesNotMatch(routeSrc, /body\?\.amount/);
});

test("M-N: binding resolved and ownership verified server-side", () => {
  assert.match(createSrc, /getSignupBindingForCheckout/);
  assert.match(createSrc, /binding\.specialist_id !== input\.specialistId/);
  assert.match(createSrc, /binding\.user_id !== input\.userId/);
});

test("O-P: active grant and paid plan short-circuit before Stripe", () => {
  assert.match(createSrc, /hasActivePromotedAccessGrant/);
  assert.match(createSrc, /already_has_access/);
  assert.match(createSrc, /resolveSpecialistEntitlements/);
  assert.match(createSrc, /subscription_access/);
});

test("Q-S: pending payment insert before Stripe with fixed amount/currency", () => {
  assert.match(createSrc, /\.insert\(/);
  assert.match(createSrc, /amount_cents: PROMOTED_ACCESS_AMOUNT_CENTS/);
  assert.match(createSrc, /currency: PROMOTED_ACCESS_CURRENCY/);
  assert.match(createSrc, /status: "pending"/);
  assert.match(createSrc, /checkout\.sessions\.create/);
  const insertIdx = createSrc.indexOf('.from("promoted_request_payments")');
  const stripeIdx = createSrc.indexOf("checkout.sessions.create");
  assert.ok(insertIdx > 0 && stripeIdx > insertIdx);
});

test("T: Stripe mode is payment", () => {
  assert.match(createSrc, /mode: "payment"/);
});

test("U: customer mapping reused", () => {
  assert.match(createSrc, /getOrCreateStripeCustomerForSpecialist/);
});

test("V-W: metadata whitelist and payment_intent_data metadata", () => {
  const meta = buildPromotedAccessStripeMetadata({
    paymentId: "pay-1",
    specialistId: "spec-1",
    promotionId: "promo-1",
    signupBindingId: "bind-1",
  });
  assert.equal(meta.purpose, PROMOTED_ACCESS_PURPOSE);
  assert.equal(Object.keys(meta).sort().join(","), [
    "payment_id",
    "promotion_id",
    "purpose",
    "signup_binding_id",
    "specialist_id",
  ].sort().join(","));
  const piMeta = buildPromotedAccessPaymentIntentMetadata({ paymentId: "pay-1" });
  assert.deepEqual(piMeta, { purpose: PROMOTED_ACCESS_PURPOSE, payment_id: "pay-1" });
});

test("X-Y: success/cancel URLs are server-built", () => {
  const urls = buildPromotedAccessCheckoutUrls({
    siteUrl: "https://freuly.de",
    lang: "ru",
  });
  assert.equal(
    urls.successUrl,
    "https://freuly.de/ru/specialist/dashboard/billing?promoted_checkout=success",
  );
  assert.equal(
    urls.cancelUrl,
    "https://freuly.de/ru/specialist/dashboard/billing?promoted_checkout=cancel",
  );
  assert.doesNotMatch(routeSrc, /bodyRecord\.success_url/);
});

test("Z-AA: Stripe success/failure updates payment attempt", () => {
  assert.match(createSrc, /stripe_checkout_session_id: session\.id/);
  assert.match(createSrc, /checkout_created_at/);
  assert.match(createSrc, /status: "failed"/);
  assert.match(createSrc, /failed_at/);
});

test("AC-AD: success response exposes checkout_url only", () => {
  assert.match(routeSrc, /checkout_url: result\.checkoutUrl/);
  assert.doesNotMatch(routeSrc, /payment_id/);
  assert.doesNotMatch(routeSrc, /stripe_checkout_session_id/);
});

test("AE: raw Stripe errors not exposed", () => {
  assert.match(createSrc, /checkout_error/);
  assert.doesNotMatch(createSrc, /err instanceof Error \? err\.message/);
  assert.doesNotMatch(routeSrc, /stripe_session_failed/);
});

test("AF-AG: promoted readiness skips subscription price IDs; disabled payments unavailable", () => {
  assert.doesNotMatch(readinessSrc, /STRIPE_PRICE_BASIC/);
  assert.doesNotMatch(readinessSrc, /listConfiguredPaidPlans/);
  assert.match(readinessSrc, /PAYMENTS_ENABLED/);
  assert.match(readinessSrc, /payments_disabled/);
});

test("AH: checkout route still does not grant access (webhook owns fulfillment)", () => {
  assert.doesNotMatch(createSrc, /promoted_request_access_grants.*insert/);
  assert.doesNotMatch(createSrc, /promoted_request_subscription_credits/);
  assert.match(webhookSrc, /processStripeBillingWebhook/);
});

test("AI-AJ: no access grant or credit creation in Phase 4B", () => {
  assert.doesNotMatch(createSrc, /promoted_request_access_grants.*insert/);
  assert.doesNotMatch(createSrc, /promoted_request_subscription_credits/);
});

test("fixed amount constants", () => {
  assert.equal(PROMOTED_ACCESS_AMOUNT_CENTS, 1000);
  assert.equal(PROMOTED_ACCESS_CURRENCY, "eur");
});
