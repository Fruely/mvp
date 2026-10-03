-- Allow a verified Apple store settlement to be paid without a Stripe PaymentIntent.
-- Apply manually after both of these, and not before:
--   2026-09-29_service_request_payment_authorization.sql
--   2026-09-30_request_offer_payment_provider_foundation.sql
-- Do not run from CI. Do not apply from the app.
-- This migration does not verify a purchase and does not enable the store flag.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'request_offer_payments'
      AND column_name = 'provider_verification_status'
  ) THEN
    RAISE EXCEPTION 'apply 2026-09-30_request_offer_payment_provider_foundation.sql first';
  END IF;
END $$;

ALTER TABLE public.request_offer_payments
  DROP CONSTRAINT IF EXISTS request_offer_payments_paid_requires_stripe_intent;

ALTER TABLE public.request_offer_payments
  ADD CONSTRAINT request_offer_payments_paid_requires_stripe_intent CHECK (
    status <> 'paid'
    OR (
      provider = 'apple'
      AND provider_transaction_id IS NOT NULL
      AND provider_verification_status = 'verified'
      AND provider_environment IN ('production', 'sandbox')
      AND stripe_payment_intent_id IS NULL
      AND stripe_checkout_session_id IS NULL
      AND stripe_charge_id IS NULL
    )
    OR (
      COALESCE(provider, 'stripe') <> 'apple'
      AND stripe_payment_intent_id IS NOT NULL
    )
  );

COMMIT;
