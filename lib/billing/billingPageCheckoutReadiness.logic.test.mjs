import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { readFileSync } from "node:fs";

function baseEnv() {
  process.env.PAYMENTS_ENABLED = "true";
  process.env.STRIPE_SECRET_KEY = "sk_test_x";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
  process.env.NEXT_PUBLIC_SITE_URL = "https://freuly.de";
  process.env.STRIPE_PRICE_BASIC_MONTHLY_ONE_TIME = "price_basic_one_time_test";
  process.env.STRIPE_PRICE_PREMIUM_MONTHLY_ONE_TIME = "price_premium_one_time_test";
}

const savedManualRenewalFlag = process.env.BILLING_MANUAL_RENEWAL_ENABLED;
const savedLegacyBasic = process.env.STRIPE_PRICE_BASIC;
const savedLegacyPremium = process.env.STRIPE_PRICE_PREMIUM;

baseEnv();

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return {
        url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

test.afterEach(() => {
  if (savedManualRenewalFlag === undefined) {
    delete process.env.BILLING_MANUAL_RENEWAL_ENABLED;
  } else {
    process.env.BILLING_MANUAL_RENEWAL_ENABLED = savedManualRenewalFlag;
  }
  if (savedLegacyBasic === undefined) {
    delete process.env.STRIPE_PRICE_BASIC;
  } else {
    process.env.STRIPE_PRICE_BASIC = savedLegacyBasic;
  }
  if (savedLegacyPremium === undefined) {
    delete process.env.STRIPE_PRICE_PREMIUM;
  } else {
    process.env.STRIPE_PRICE_PREMIUM = savedLegacyPremium;
  }
});

const {
  isBillingPageCheckoutDisabledBannerVisible,
  isBillingPagePlanCheckoutEnabled,
} = await import("./billingPageCheckoutReadiness.ts");

const billingPageSrc = readFileSync(
  new URL("../../app/[lang]/specialist/(protected)/dashboard/billing/page.tsx", import.meta.url),
  "utf8",
);

test("manual renewal: per-plan readiness uses one-time prices without legacy recurring env", () => {
  delete process.env.STRIPE_PRICE_BASIC;
  delete process.env.STRIPE_PRICE_PREMIUM;
  process.env.BILLING_MANUAL_RENEWAL_ENABLED = "true";

  assert.equal(isBillingPagePlanCheckoutEnabled("basic"), true);
  assert.equal(isBillingPagePlanCheckoutEnabled("premium"), true);
  assert.equal(isBillingPageCheckoutDisabledBannerVisible(), false);
});

test("manual renewal: missing one-time price disables only that plan", () => {
  delete process.env.STRIPE_PRICE_BASIC;
  delete process.env.STRIPE_PRICE_PREMIUM;
  process.env.BILLING_MANUAL_RENEWAL_ENABLED = "true";
  delete process.env.STRIPE_PRICE_PREMIUM_MONTHLY_ONE_TIME;

  assert.equal(isBillingPagePlanCheckoutEnabled("basic"), true);
  assert.equal(isBillingPagePlanCheckoutEnabled("premium"), false);
  assert.equal(isBillingPageCheckoutDisabledBannerVisible(), false);
});

test("legacy path: recurring prices gate all plans and banner", () => {
  delete process.env.BILLING_MANUAL_RENEWAL_ENABLED;
  delete process.env.STRIPE_PRICE_BASIC;
  delete process.env.STRIPE_PRICE_PREMIUM;

  assert.equal(isBillingPagePlanCheckoutEnabled("basic"), false);
  assert.equal(isBillingPagePlanCheckoutEnabled("premium"), false);
  assert.equal(isBillingPageCheckoutDisabledBannerVisible(), true);

  process.env.STRIPE_PRICE_BASIC = "price_basic_recurring";
  process.env.STRIPE_PRICE_PREMIUM = "price_premium_recurring";

  assert.equal(isBillingPagePlanCheckoutEnabled("basic"), true);
  assert.equal(isBillingPagePlanCheckoutEnabled("premium"), true);
  assert.equal(isBillingPageCheckoutDisabledBannerVisible(), false);
});

test("billing page branches manual vs legacy readiness", () => {
  assert.match(billingPageSrc, /isBillingPagePlanCheckoutEnabled\(entry\.code\)/);
  assert.match(billingPageSrc, /isBillingPageCheckoutDisabledBannerVisible/);
  assert.doesNotMatch(billingPageSrc, /getStripeCheckoutReadiness/);
});
