import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  REQUEST_OFFER_PAYMENT_PROVIDERS,
  STRIPE_REQUEST_OFFER_PAYMENT_PROVIDER,
  stripePaymentIntentAttribution,
} from "./requestOfferPaymentProvider.ts";

const migration = readFileSync(
  new URL(
    "../../supabase/manual_migrations/2026-09-30_request_offer_payment_provider_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);
const originalPayments = readFileSync(
  new URL(
    "../../supabase/manual_migrations/2026-09-15_request_offer_ppl_entitlements.sql",
    import.meta.url,
  ),
  "utf8",
);
const authorizationMigration = readFileSync(
  new URL(
    "../../supabase/manual_migrations/2026-09-29_service_request_payment_authorization.sql",
    import.meta.url,
  ),
  "utf8",
);

test("provider stays nullable and accepts only stripe, apple, and google", () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS provider text NULL/);
  assert.doesNotMatch(migration, /provider text NOT NULL/);
  assert.match(
    migration,
    /provider IS NULL OR provider IN \('stripe', 'apple', 'google'\)/,
  );
  assert.deepEqual(REQUEST_OFFER_PAYMENT_PROVIDERS, ["stripe", "apple", "google"]);
  assert.equal(STRIPE_REQUEST_OFFER_PAYMENT_PROVIDER, "stripe");
});

test("blank provider transaction and product ids are rejected", () => {
  assert.match(
    migration,
    /provider_transaction_id IS NULL OR length\(trim\(provider_transaction_id\)\) > 0/,
  );
  assert.match(
    migration,
    /provider_product_id IS NULL OR length\(trim\(provider_product_id\)\) > 0/,
  );
});

test("verification status and environment have their own allowlists", () => {
  assert.match(
    migration,
    /provider_verification_status IN \('pending', 'verified', 'rejected'\)/,
  );
  assert.match(
    migration,
    /provider_environment IS NULL OR provider_environment IN \('production', 'sandbox'\)/,
  );
  assert.doesNotMatch(migration, /apple_verified|google_verified|stripe_paid/);
});

test("one provider transaction identity cannot be reused, and providers do not collide", () => {
  assert.match(
    migration,
    /uq_request_offer_payments_provider_transaction[\s\S]*provider,[\s\S]*COALESCE\(provider_environment, ''\),[\s\S]*provider_transaction_id[\s\S]*WHERE provider IS NOT NULL[\s\S]*AND provider_transaction_id IS NOT NULL/,
  );
  const attributed = stripePaymentIntentAttribution("pi_same");
  assert.deepEqual(attributed, {
    provider: "stripe",
    provider_transaction_id: "pi_same",
  });
});

test("existing Stripe unique and paid-origin constraints are not weakened", () => {
  assert.match(originalPayments, /request_offer_payments_stripe_checkout_session_id_unique/);
  assert.match(originalPayments, /request_offer_payments_stripe_payment_intent_id_unique/);
  assert.match(originalPayments, /request_offer_payments_stripe_charge_id_unique/);
  assert.match(originalPayments, /request_offer_payments_paid_requires_stripe_intent/);
  assert.match(authorizationMigration, /request_offer_payments_paid_requires_stripe_session/);
  for (const name of [
    "request_offer_payments_stripe_checkout_session_id_unique",
    "request_offer_payments_stripe_payment_intent_id_unique",
    "request_offer_payments_stripe_charge_id_unique",
    "request_offer_payments_paid_requires_stripe_intent",
    "request_offer_payments_paid_requires_stripe_session",
    "request_offer_payments_status_check",
  ]) {
    assert.equal(migration.includes(`DROP CONSTRAINT IF EXISTS ${name}`), false);
  }
});

test("backfill tags proven Stripe rows and copies only a PaymentIntent id", () => {
  assert.match(migration, /SET provider = 'stripe'/);
  assert.match(migration, /stripe_checkout_session_id/);
  assert.match(migration, /stripe_payment_intent_id/);
  assert.match(migration, /stripe_charge_id/);
  assert.match(migration, /SET provider_transaction_id = stripe_payment_intent_id/);
  assert.doesNotMatch(migration, /provider_transaction_id = stripe_checkout_session_id/);
  assert.doesNotMatch(migration, /provider_transaction_id = stripe_charge_id/);
  const updates = migration.match(/UPDATE public\.request_offer_payments[\s\S]*?;/g) ?? [];
  assert.equal(updates.length, 2);
  for (const statement of updates) {
    assert.equal(statement.includes("amount_cents"), false);
    assert.equal(statement.includes("status"), false);
  }
});

test("this foundation does not add store verification or a payment-required event", () => {
  const files = [
    migration,
    readFileSync(new URL("./requestOfferPaymentProvider.ts", import.meta.url), "utf8"),
    readFileSync(new URL("./createServiceRequestAuthorization.ts", import.meta.url), "utf8"),
    readFileSync(new URL("./createRequestOfferCheckout.ts", import.meta.url), "utf8"),
    readFileSync(new URL("./processRequestOfferWebhook.ts", import.meta.url), "utf8"),
    readFileSync(new URL("./fulfillServiceRequestCapture.ts", import.meta.url), "utf8"),
    readFileSync(new URL("./paymentProvider.ts", import.meta.url), "utf8"),
    readFileSync(new URL("./createPlanPaymentCheckout.ts", import.meta.url), "utf8"),
  ];
  const joined = files.join("\n");
  assert.equal(joined.includes("StoreKit"), false);
  assert.equal(joined.includes("Google Play"), false);
  assert.equal(joined.includes("App Store Server"), false);
  assert.equal(joined.includes("payment_required"), false);
  assert.equal(joined.includes("SERVICE_REQUEST_STORE_PAYMENT_ENABLED"), false);
  assert.equal(
    readFileSync(new URL("./paymentProvider.ts", import.meta.url), "utf8").includes(
      "requestOfferPaymentProvider",
    ),
    false,
  );
  assert.equal(
    readFileSync(new URL("./createPlanPaymentCheckout.ts", import.meta.url), "utf8").includes(
      "requestOfferPaymentProvider",
    ),
    false,
  );
});
