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

const { isPlanCardCurrent } = await import("../specialists/subscriptionDisplay.ts");

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

// -------------------------------------------------------
// Regression: no pre-Stripe customer-facing placeholders
// -------------------------------------------------------

const subscriptionPageSrc = readFileSync(
  new URL("../../app/[lang]/specialist/(protected)/dashboard/subscription/page.tsx", import.meta.url),
  "utf8",
);

const subscriptionDisplaySrc = readFileSync(
  new URL("../../lib/specialists/subscriptionDisplay.ts", import.meta.url),
  "utf8",
);

test("no orphaned pre-Stripe billing locale keys in any locale", () => {
  const orphanKeys = [
    "dashboard.billingPage.paymentsTitle",
    "dashboard.billingPage.paymentsBody",
    "dashboard.billingPage.invoiceTitle",
    "dashboard.billingPage.invoiceBody",
    "dashboard.billingPage.futureTitle",
    "dashboard.billingPage.futureBody",
    "dashboard.billingPage.planPicker.freeHint",
    "dashboard.billingPage.planPicker.paidHint",
    "dashboard.billingPage.planPicker.starterActive",
    "dashboard.billingPage.checkout.paymentsDisabled",
    "dashboard.billingPage.checkout.providerNotConfigured",
    "dashboard.billingPage.checkout.successNotice",
  ];
  for (const [name, locale] of [["ru", ruLocale], ["ua", uaLocale], ["de", deLocale]]) {
    for (const key of orphanKeys) {
      assert.equal(locale[key], undefined, `${name} still has orphan key: ${key}`);
    }
  }
});

test("locales do not contain 'payments coming later' / 'tiers coming later' text", () => {
  for (const [name, locale] of [["ru", ruLocale], ["ua", uaLocale], ["de", deLocale]]) {
    const allValues = Object.values(locale).join("\n");
    assert.doesNotMatch(allValues, /появятся позже|з'являться пізніше|Tarife folgen später/i,
      `${name} still has 'paid tiers coming later' copy`);
  }
});

test("locales do not contain 'payments not accepted on platform'", () => {
  for (const [name, locale] of [["ru", ruLocale], ["ua", uaLocale], ["de", deLocale]]) {
    const billingKeys = Object.entries(locale).filter(([k]) =>
      k.startsWith("dashboard.billingPage.") || k.startsWith("dashboard.subscriptionNotice."));
    for (const [key, val] of billingKeys) {
      assert.doesNotMatch(String(val),
        /не принимается|не приймається|nicht.*(angenommen|entgegengenommen)/i,
        `${name} key ${key} still says payments not accepted`);
    }
  }
});

test("subscriptionPage subtitle does not mention payments not connected", () => {
  for (const [name, locale] of [["ru", ruLocale], ["ua", uaLocale], ["de", deLocale]]) {
    assert.doesNotMatch(
      locale["dashboard.subscriptionPage.subtitle"],
      /не подключена|не підключена|nicht aktiviert/i,
      `${name} subscriptionPage.subtitle still says payments not connected`);
  }
});

test("RU/UA/DE have status.inactive and subscriptionNotice.inactive keys", () => {
  for (const [name, locale] of [["ru", ruLocale], ["ua", uaLocale], ["de", deLocale]]) {
    assert.ok(locale["dashboard.subscriptionPage.status.inactive"], `${name} missing status.inactive`);
    assert.ok(locale["dashboard.subscriptionNotice.inactiveTitle"], `${name} missing inactiveTitle`);
    assert.ok(locale["dashboard.subscriptionNotice.inactiveBody"], `${name} missing inactiveBody`);
  }
});

test("plan_code without active lifecycle does not make plan current", () => {
  for (const status of ["grace", "grace_period", "inactive", "expired", "early_access", "cancelled"]) {
    assert.equal(isPlanCardCurrent("basic", "basic", status), false,
      `basic/basic/${status} should NOT be current`);
    assert.equal(isPlanCardCurrent("premium", "premium", status), false,
      `premium/premium/${status} should NOT be current`);
  }
});

test("isPaymentCurrentlyDisabled field is removed from subscriptionDisplay", () => {
  assert.doesNotMatch(subscriptionDisplaySrc, /isPaymentCurrentlyDisabled/,
    "subscriptionDisplay should not contain isPaymentCurrentlyDisabled at all");
});

test("subscription page does not render paymentDisabledShort/Body block", () => {
  assert.doesNotMatch(subscriptionPageSrc, /paymentDisabledShort/,
    "subscription page still shows paymentDisabledShort");
  assert.doesNotMatch(subscriptionPageSrc, /paymentDisabledBody/,
    "subscription page still shows paymentDisabledBody");
});

test("subscription page uses bulletPayment, not bulletPaidLater", () => {
  assert.doesNotMatch(subscriptionPageSrc, /bulletPaidLater/,
    "subscription page still references bulletPaidLater");
  assert.match(subscriptionPageSrc, /bulletPayment/,
    "subscription page should reference bulletPayment");
});

test("legacy Starter/free fallback not used for grace/inactive in UI", () => {
  assert.doesNotMatch(billingPageSrc, /starterActive/,
    "billing page references legacy starterActive");
  assert.doesNotMatch(billingPageSrc, /freeHint/,
    "billing page references legacy freeHint");
});

test("subscriptionDisplay exports isPlanCardCurrent as single source of truth", () => {
  assert.match(subscriptionDisplaySrc, /export function isPlanCardCurrent/,
    "isPlanCardCurrent should be defined in subscriptionDisplay");
});

test("billing page imports isPlanCardCurrent from subscriptionDisplay", () => {
  assert.match(billingPageSrc, /isPlanCardCurrent.*from.*subscriptionDisplay/,
    "billing page should import isPlanCardCurrent from subscriptionDisplay");
});

test("inactive notice in subscriptionDisplay uses i18n, not hardcoded Russian", () => {
  assert.doesNotMatch(subscriptionDisplaySrc, /Профиль скрыт/,
    "subscriptionDisplay still has hardcoded Russian for inactive notice");
});

test("SubscriptionCard.tsx dead component is deleted", () => {
  let exists = true;
  try { readFileSync(new URL("../../components/dashboard/SubscriptionCard.tsx", import.meta.url)); } catch { exists = false; }
  assert.equal(exists, false, "SubscriptionCard.tsx should be deleted");
});

test("isContactsLocked.ts dead helper is deleted", () => {
  let exists = true;
  try { readFileSync(new URL("../../lib/dashboard/isContactsLocked.ts", import.meta.url)); } catch { exists = false; }
  assert.equal(exists, false, "isContactsLocked.ts should be deleted");
});
