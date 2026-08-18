import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNativeBillingDeepLink,
  buildTrustedLegacyBillingCheckoutUrls,
  buildTrustedPlanPaymentCheckoutUrls,
  parseCheckoutReturnOutcome,
  parseCheckoutReturnTarget,
} from "./checkoutReturnTarget.ts";

test("return_target defaults to web and rejects arbitrary values", () => {
  assert.equal(parseCheckoutReturnTarget(undefined), "web");
  assert.equal(parseCheckoutReturnTarget(null), "web");
  assert.equal(parseCheckoutReturnTarget(""), "web");
  assert.equal(parseCheckoutReturnTarget("web"), "web");
  assert.equal(parseCheckoutReturnTarget("native"), "native");
  assert.equal(parseCheckoutReturnTarget("NATIVE"), "native");
  assert.equal(parseCheckoutReturnTarget("https://evil.example"), null);
  assert.equal(parseCheckoutReturnTarget("freuly://specialist/billing"), null);
  assert.equal(parseCheckoutReturnTarget({ success_url: "https://evil" }), null);
});

test("web checkout URLs stay on the specialist billing page", () => {
  const urls = buildTrustedPlanPaymentCheckoutUrls({
    siteUrl: "https://freuly.de",
    lang: "de",
    planCode: "basic",
    returnTarget: "web",
  });
  assert.equal(
    urls.successUrl,
    "https://freuly.de/de/specialist/dashboard/billing?checkout=success&plan=basic",
  );
  assert.equal(
    urls.cancelUrl,
    "https://freuly.de/de/specialist/dashboard/billing?checkout=cancelled&plan=basic",
  );
});

test("legacy web cancel query remains checkout=cancel", () => {
  const urls = buildTrustedLegacyBillingCheckoutUrls({
    siteUrl: "https://freuly.de",
    lang: "ua",
    planCode: "premium",
    returnTarget: "web",
  });
  assert.match(urls.cancelUrl, /checkout=cancel&plan=premium/);
  assert.doesNotMatch(urls.cancelUrl, /cancelled/);
});

test("native Stripe URLs are HTTPS bounce paths, not client schemes", () => {
  const urls = buildTrustedPlanPaymentCheckoutUrls({
    siteUrl: "https://freuly.de",
    lang: "ru",
    planCode: "premium",
    returnTarget: "native",
  });
  assert.equal(
    urls.successUrl,
    "https://freuly.de/api/billing/checkout-return?checkout=success&plan=premium&target=native",
  );
  assert.equal(
    urls.cancelUrl,
    "https://freuly.de/api/billing/checkout-return?checkout=cancelled&plan=premium&target=native",
  );
  assert.doesNotMatch(urls.successUrl, /^freuly:/);
  assert.doesNotMatch(urls.successUrl, /evil/);
});

test("native deep link is the registered app route and is not entitlement", () => {
  assert.equal(
    buildNativeBillingDeepLink({ checkout: "success", planCode: "basic" }),
    "freuly://specialist/billing?checkout=success&plan=basic",
  );
  assert.equal(
    buildNativeBillingDeepLink({ checkout: "cancelled", planCode: "premium" }),
    "freuly://specialist/billing?checkout=cancelled&plan=premium",
  );
  assert.equal(parseCheckoutReturnOutcome("success"), "success");
  assert.equal(parseCheckoutReturnOutcome("cancelled"), "cancelled");
  assert.equal(parseCheckoutReturnOutcome("paid"), null);
  assert.equal(parseCheckoutReturnOutcome("cancel"), null);
});
