import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import {
  billingHarness,
  resetBillingHarness,
} from "./testMocks/promotedAccess.harness.mjs";

const ROUTE = new URL(
  "../../app/api/billing/promoted-access/checkout/route.ts",
  import.meta.url,
).href;

process.env.PAYMENTS_ENABLED = "true";
process.env.STRIPE_SECRET_KEY = "sk_test_x";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_x";
process.env.NEXT_PUBLIC_SITE_URL = "https://freuly.de";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const map = {
      "@/lib/supabase/server": new URL("./testMocks/billing-service-server.mjs", import.meta.url)
        .href,
      "@/lib/supabase/auth-server": new URL("./testMocks/billing-auth-server.mjs", import.meta.url)
        .href,
      "@/lib/billing/stripeClient": new URL("./testMocks/stripe-client.mjs", import.meta.url).href,
      "server-only": new URL("../serviceRequests/testMocks/server-only.mjs", import.meta.url).href,
      "next/server": new URL("../leads/testMocks/next-server.mjs", import.meta.url).href,
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

const READY_ENV = {
  PAYMENTS_ENABLED: "true",
  STRIPE_SECRET_KEY: "sk_test_x",
  STRIPE_WEBHOOK_SECRET: "whsec_x",
  NEXT_PUBLIC_SITE_URL: "https://freuly.de",
};

const { POST } = await import(ROUTE);
const { createPromotedAccessCheckout } = await import("./createPromotedAccessCheckout.ts");

const USER_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const SPECIALIST_ID = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
const PROMOTION_ID = "cccccccc-dddd-eeee-ffff-000000000001";
const BINDING_ID = "dddddddd-eeee-ffff-0000-111111111111";

function saveEnv() {
  return {
    PAYMENTS_ENABLED: process.env.PAYMENTS_ENABLED,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  };
}

function restoreEnv(saved) {
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function seedEligible() {
  billingHarness.specialists.push({
    id: SPECIALIST_ID,
    user_id: USER_ID,
    status: "draft",
  });
  billingHarness.signupBindings.push({
    id: BINDING_ID,
    promotion_id: PROMOTION_ID,
    specialist_id: SPECIALIST_ID,
    user_id: USER_ID,
  });
  billingHarness.promotions.push({ id: PROMOTION_ID });
}

let savedEnv;

test.beforeEach(() => {
  savedEnv = saveEnv();
  resetBillingHarness();
  Object.assign(process.env, READY_ENV);
});

test.afterEach(() => {
  restoreEnv(savedEnv);
});

function makeRequest(body) {
  return {
    json: async () => body,
  };
}

test("route rejects unauthenticated requests", async () => {
  billingHarness.authShouldFail = true;
  const res = await POST(makeRequest({ lang: "ru" }));
  assert.equal(res.status, 401);
});

test("route rejects extra body fields", async () => {
  seedEligible();
  const res = await POST(makeRequest({ lang: "ru", promotion_id: PROMOTION_ID }));
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.equal(json.error, "untrusted_fields");
});

test("route rejects invalid lang", async () => {
  seedEligible();
  const res = await POST(makeRequest({ lang: "en" }));
  assert.equal(res.status, 400);
});

test("missing binding returns not_eligible", async () => {
  billingHarness.specialists.push({
    id: SPECIALIST_ID,
    user_id: USER_ID,
    status: "draft",
  });
  const res = await POST(makeRequest({ lang: "ru" }));
  assert.equal(res.status, 403);
  assert.equal((await res.json()).error, "not_eligible");
});

test("active access grant returns already_has_access", async () => {
  seedEligible();
  billingHarness.accessGrants.push({
    id: "grant-1",
    specialist_id: SPECIALIST_ID,
    promotion_id: PROMOTION_ID,
    revoked_at: null,
  });
  const res = await POST(makeRequest({ lang: "ru" }));
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, "already_has_access");
  assert.equal(billingHarness.stripeSessions.length, 0);
});

test("paid plan returns subscription_access", async () => {
  seedEligible();
  billingHarness.specialistPlans.push({
    specialist_id: SPECIALIST_ID,
    plan_code: "basic",
    plan_status: "active",
  });
  const res = await POST(makeRequest({ lang: "ru" }));
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, "subscription_access");
  assert.equal(billingHarness.stripeSessions.length, 0);
});

test("basic + early_access allows checkout via resolveSpecialistEntitlements", async () => {
  seedEligible();
  billingHarness.specialistPlans.push({
    specialist_id: SPECIALIST_ID,
    plan_code: "basic",
    plan_status: "early_access",
  });
  const res = await POST(makeRequest({ lang: "ru" }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).checkout_url, "https://checkout.stripe.com/c/pay/test-promoted-access");
  assert.equal(billingHarness.stripeSessions.length, 1);
});

test("premium + trialing allows checkout via resolveSpecialistEntitlements", async () => {
  seedEligible();
  billingHarness.specialistPlans.push({
    specialist_id: SPECIALIST_ID,
    plan_code: "premium",
    plan_status: "trialing",
  });
  const res = await POST(makeRequest({ lang: "ru" }));
  assert.equal(res.status, 200);
  assert.equal((await res.json()).checkout_url, "https://checkout.stripe.com/c/pay/test-promoted-access");
  assert.equal(billingHarness.stripeSessions.length, 1);
});

test("successful checkout inserts pending payment then creates Stripe session", async () => {
  seedEligible();
  const res = await POST(makeRequest({ lang: "ru" }));
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.checkout_url, "https://checkout.stripe.com/c/pay/test-promoted-access");
  assert.equal(Object.keys(json).length, 1);
  assert.equal(billingHarness.payments.length, 1);
  assert.equal(billingHarness.payments[0].status, "pending");
  assert.equal(billingHarness.payments[0].amount_cents, 1000);
  assert.equal(billingHarness.payments[0].currency, "eur");
  assert.equal(billingHarness.payments[0].stripe_checkout_session_id, "cs_test_promoted_access");
  assert.ok(billingHarness.payments[0].checkout_created_at);
  assert.equal(billingHarness.stripeSessions.length, 1);
  const session = billingHarness.stripeSessions[0];
  assert.equal(session.mode, "payment");
  assert.equal(session.line_items[0].price_data.unit_amount, 1000);
  assert.equal(session.line_items[0].price_data.currency, "eur");
  assert.equal(session.metadata.purpose, "promoted_request_access");
  assert.equal(session.payment_intent_data.metadata.purpose, "promoted_request_access");
  assert.ok(session.metadata.payment_id);
  assert.equal(session.payment_intent_data.metadata.payment_id, session.metadata.payment_id);
});

test("DB insert failure prevents Stripe session creation", async () => {
  seedEligible();
  billingHarness.paymentInsertError = { code: "XX000", message: "insert failed" };
  const result = await createPromotedAccessCheckout({
    supabase: (await import("./testMocks/billing-service-server.mjs")).createSupabaseServerClient(),
    specialistId: SPECIALIST_ID,
    userId: USER_ID,
    lang: "ru",
    siteUrl: "https://freuly.de",
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "db_error");
  assert.equal(billingHarness.stripeSessions.length, 0);
});

test("Stripe failure marks payment attempt failed", async () => {
  seedEligible();
  billingHarness.stripeShouldFail = true;
  const result = await createPromotedAccessCheckout({
    supabase: (await import("./testMocks/billing-service-server.mjs")).createSupabaseServerClient(),
    specialistId: SPECIALIST_ID,
    userId: USER_ID,
    lang: "ru",
    siteUrl: "https://freuly.de",
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "checkout_error");
  assert.equal(billingHarness.payments.length, 1);
  assert.equal(billingHarness.payments[0].status, "failed");
  assert.ok(billingHarness.payments[0].failed_at);
});

test("payments disabled returns payments_unavailable", async () => {
  seedEligible();
  process.env.PAYMENTS_ENABLED = "false";
  const res = await POST(makeRequest({ lang: "ru" }));
  assert.equal(res.status, 503);
  assert.equal((await res.json()).error, "payments_unavailable");
});

test("no access grant or credit rows created", async () => {
  seedEligible();
  await POST(makeRequest({ lang: "ru" }));
  assert.equal(billingHarness.accessGrants.length, 0);
});
