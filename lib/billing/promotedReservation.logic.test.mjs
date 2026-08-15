import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";

process.env.PAYMENTS_ENABLED = "true";
process.env.STRIPE_SECRET_KEY = "sk_test_x";
process.env.NEXT_PUBLIC_SITE_URL = "https://freuly.de";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const map = {
      "server-only": new URL("../serviceRequests/testMocks/server-only.mjs", import.meta.url).href,
      "@/lib/supabase/server": new URL("./testMocks/billing-service-server.mjs", import.meta.url)
        .href,
      "@/lib/billing/stripeClient": new URL("./testMocks/stripe-client.mjs", import.meta.url).href,
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

const fulfillmentSrc = readFileSync(
  new URL("./completePromotedReservationRegistration.ts", import.meta.url),
  "utf8",
);

const {
  PROMOTED_REGISTRATION_DEADLINE_HOURS,
  PROMOTED_SUBSCRIPTION_CREDIT_DAYS,
  PROMOTED_RESERVATION_PURPOSE,
} = await import("./promotedAccessConstants.ts");

const {
  buildPromotedReservationStripeMetadata,
  buildPromotedReservationCheckoutUrls,
} = await import("./createPromotedReservationCheckout.ts");

const { isPromotedReservationExpired, fulfillPromotedReservationPaid } = await import(
  "./promotedReservationFulfillment.ts"
);

const webhookSrc = readFileSync(
  new URL("./processPromotedReservationWebhook.ts", import.meta.url),
  "utf8",
);
const orchestratorSrc = readFileSync(
  new URL("./processStripeBillingWebhook.ts", import.meta.url),
  "utf8",
);
const checkoutRouteSrc = readFileSync(
  new URL("../../app/api/billing/promoted-reservation/checkout/route.ts", import.meta.url),
  "utf8",
);
const registerRouteSrc = readFileSync(
  new URL("../../app/api/specialists/register/route.ts", import.meta.url),
  "utf8",
);

test("72-hour registration deadline constant", () => {
  assert.equal(PROMOTED_REGISTRATION_DEADLINE_HOURS, 72);
  assert.equal(PROMOTED_SUBSCRIPTION_CREDIT_DAYS, 3);
});

test("reservation stripe metadata purpose", () => {
  const meta = buildPromotedReservationStripeMetadata({
    reservationId: "res-1",
    promotionId: "promo-1",
    publicToken: "tok",
  });
  assert.equal(meta.purpose, PROMOTED_RESERVATION_PURPOSE);
  assert.equal(meta.reservation_id, "res-1");
});

test("checkout success URL points to accept page not unlock", () => {
  const urls = buildPromotedReservationCheckoutUrls({
    siteUrl: "https://freuly.de",
    lang: "ru",
    publicToken: "abc",
  });
  assert.match(urls.successUrl, /\/ru\/request\/abc\/accept\?reservation=success/);
  assert.match(urls.cancelUrl, /reservation=cancel/);
  assert.doesNotMatch(urls.successUrl, /client_email/);
});

test("expired reservation detected server-side", () => {
  const expired = isPromotedReservationExpired(
    {
      id: "r1",
      promotion_id: "p1",
      public_token: "t",
      status: "paid_pending_registration",
      payer_email: "a@b.c",
      paid_at: new Date(Date.now() - 80 * 3600 * 1000).toISOString(),
      registration_deadline: new Date(Date.now() - 3600 * 1000).toISOString(),
      registration_completed_at: null,
      user_id: null,
      specialist_id: null,
      signup_binding_id: null,
      promoted_payment_id: null,
    },
    Date.now(),
  );
  assert.equal(expired, true);
});

test("fulfillPromotedReservationPaid sets 72h deadline", async () => {
  const updates = [];
  const supabase = {
    from(table) {
      assert.equal(table, "promoted_request_reservations");
      return {
        update(payload) {
          updates.push(payload);
          return { eq: async () => ({ error: null }) };
        },
      };
    },
  };

  const paidAt = new Date("2026-08-15T12:00:00.000Z").toISOString();
  const result = await fulfillPromotedReservationPaid(
    supabase,
    {
      id: "res-1",
      promotion_id: "p1",
      public_token: "t",
      status: "pending_payment",
      payer_email: null,
      paid_at: null,
      registration_deadline: null,
      registration_completed_at: null,
      user_id: null,
      specialist_id: null,
      signup_binding_id: null,
      promoted_payment_id: null,
    },
    {
      paymentIntentId: "pi_1",
      chargeId: "ch_1",
      payerEmail: "pay@example.com",
      paidAt,
    },
  );

  assert.equal(result, "success");
  assert.equal(updates[0].status, "paid_pending_registration");
  assert.equal(updates[0].registration_deadline, "2026-08-18T12:00:00.000Z");
});

test("duplicate paid webhook is idempotent", async () => {
  let updateCount = 0;
  const supabase = {
    from() {
      return {
        update(payload) {
          updateCount += 1;
          assert.equal(payload.status, undefined);
          return { eq: async () => ({ error: null }) };
        },
      };
    },
  };

  const result = await fulfillPromotedReservationPaid(
    supabase,
    {
      id: "res-1",
      promotion_id: "p1",
      public_token: "t",
      status: "paid_pending_registration",
      payer_email: "pay@example.com",
      paid_at: new Date().toISOString(),
      registration_deadline: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      registration_completed_at: null,
      user_id: null,
      specialist_id: null,
      signup_binding_id: null,
      promoted_payment_id: null,
    },
    {
      paymentIntentId: "pi_1",
      chargeId: "ch_1",
      payerEmail: "pay@example.com",
      paidAt: new Date().toISOString(),
    },
  );

  assert.equal(result, "success");
  assert.equal(updateCount, 1);
});

test("registration completion requires real stripe IDs", () => {
  assert.match(fulfillmentSrc, /if \(!stripeSessionId \|\| !stripeIntentId\)/);
  assert.doesNotMatch(fulfillmentSrc, /reservation_\$\{reservation\.id\}/);
});

test("webhook is wired in billing orchestrator", () => {
  assert.match(orchestratorSrc, /processStripeWebhookEventForPromotedReservation/);
  assert.match(webhookSrc, /checkout\.session\.completed/);
  assert.match(webhookSrc, /PROMOTED_RESERVATION_PURPOSE/);
});

test("checkout route sets reservation cookie", () => {
  assert.match(checkoutRouteSrc, /PROMOTED_RESERVATION_COOKIE_NAME/);
  assert.match(checkoutRouteSrc, /response\.cookies\.set/);
});

test("register route completes reservation after binding", () => {
  assert.match(registerRouteSrc, /completePromotedReservationRegistration/);
  assert.match(registerRouteSrc, /PROMOTED_RESERVATION_COOKIE_NAME/);
});

test("expired reservation does not proceed to grant in completion", () => {
  assert.match(fulfillmentSrc, /isPromotedReservationExpired/);
  assert.match(fulfillmentSrc, /status: "expired"/);
});
