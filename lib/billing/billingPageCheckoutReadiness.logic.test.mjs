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

const { isPlanCardCurrent } = await import("./billingPageUi.ts");

const billingPageSrc = readFileSync(
  new URL("../../app/[lang]/specialist/(protected)/dashboard/billing/page.tsx", import.meta.url),
  "utf8",
);

const ruLocale = JSON.parse(
  readFileSync(new URL("../../locales/ru.json", import.meta.url), "utf8"),
);
const uaLocale = JSON.parse(
  readFileSync(new URL("../../locales/ua.json", import.meta.url), "utf8"),
);
const deLocale = JSON.parse(
  readFileSync(new URL("../../locales/de.json", import.meta.url), "utf8"),
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

// -------------------------------------------------------
// isPlanCardCurrent: lifecycle-aware CURRENT badge logic
// -------------------------------------------------------

test("active basic → Professional CURRENT", () => {
  assert.equal(isPlanCardCurrent("basic", "basic", "active"), true);
});

test("active basic → Growth NOT CURRENT", () => {
  assert.equal(isPlanCardCurrent("premium", "basic", "active"), false);
});

test("active premium → Growth CURRENT", () => {
  assert.equal(isPlanCardCurrent("premium", "premium", "active"), true);
});

test("active premium → Professional NOT CURRENT", () => {
  assert.equal(isPlanCardCurrent("basic", "premium", "active"), false);
});

test("grace basic → Professional NOT CURRENT", () => {
  assert.equal(isPlanCardCurrent("basic", "basic", "grace"), false);
});

test("grace basic → Growth NOT CURRENT", () => {
  assert.equal(isPlanCardCurrent("premium", "basic", "grace"), false);
});

test("grace_period basic → Professional NOT CURRENT", () => {
  assert.equal(isPlanCardCurrent("basic", "basic", "grace_period"), false);
});

test("inactive basic → Professional NOT CURRENT", () => {
  assert.equal(isPlanCardCurrent("basic", "basic", "inactive"), false);
});

test("inactive premium → Growth NOT CURRENT", () => {
  assert.equal(isPlanCardCurrent("premium", "premium", "inactive"), false);
});

test("early_access starter → Professional NOT CURRENT", () => {
  assert.equal(isPlanCardCurrent("basic", "starter", "early_access"), false);
});

// -------------------------------------------------------
// Lifecycle-aware billing page UI structure
// -------------------------------------------------------

test("billing page uses isPlanCardCurrent not raw code comparison for badge", () => {
  assert.match(billingPageSrc, /isPlanCardCurrent\(/);
  assert.doesNotMatch(billingPageSrc, /const isCurrent = currentPlanCode === entry\.code/);
});

test("billing page shows grace notice with graceUntil placeholder", () => {
  assert.match(billingPageSrc, /graceNotice/);
  assert.match(billingPageSrc, /graceUntil/);
});

test("billing page shows inactive notice", () => {
  assert.match(billingPageSrc, /inactiveNotice/);
});

test("billing page removed legacy payment/invoice/future placeholder sections", () => {
  assert.doesNotMatch(billingPageSrc, /paymentsTitle/);
  assert.doesNotMatch(billingPageSrc, /invoiceTitle/);
  assert.doesNotMatch(billingPageSrc, /futureTitle/);
});

test("billing page uses lastPlanLabel for grace/inactive", () => {
  assert.match(billingPageSrc, /lastPlanLabel/);
});

// -------------------------------------------------------
// Locale keys present in all languages
// -------------------------------------------------------

test("RU/UA/DE locales have graceNotice, inactiveNotice, lastPlanLabel keys", () => {
  for (const [name, locale] of [["ru", ruLocale], ["ua", uaLocale], ["de", deLocale]]) {
    assert.ok(locale["dashboard.billingPage.graceNotice"], `${name} missing graceNotice`);
    assert.ok(locale["dashboard.billingPage.graceNoticeNoDays"], `${name} missing graceNoticeNoDays`);
    assert.ok(locale["dashboard.billingPage.inactiveNotice"], `${name} missing inactiveNotice`);
    assert.ok(locale["dashboard.billingPage.lastPlanLabel"], `${name} missing lastPlanLabel`);
  }
});

test("RU/UA/DE graceNotice contains {{graceUntil}} placeholder", () => {
  for (const [name, locale] of [["ru", ruLocale], ["ua", uaLocale], ["de", deLocale]]) {
    assert.match(
      locale["dashboard.billingPage.graceNotice"],
      /\{\{graceUntil\}\}/,
      `${name} graceNotice missing {{graceUntil}} placeholder`,
    );
  }
});

test("RU/UA/DE subtitles no longer mention pre-Stripe placeholder", () => {
  for (const [name, locale] of [["ru", ruLocale], ["ua", uaLocale], ["de", deLocale]]) {
    assert.doesNotMatch(
      locale["dashboard.billingPage.subtitle"],
      /списаний|Abbuchungen|списань/i,
      `${name} subtitle still contains legacy placeholder text`,
    );
    assert.doesNotMatch(
      locale["dashboard.billingPage.planPicker.subtitle"],
      /не принимаются|не приймаються|nicht angenommen/i,
      `${name} planPicker.subtitle still says payments not accepted`,
    );
  }
});
