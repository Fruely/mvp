-- Binds one reserved service_request_claim to one payment sequence: stripe or store.
-- Apply manually, after 2026-09-30_request_offer_payment_provider_foundation.sql.
-- Apply this migration before deploying runtime that reads or writes payment_rail.
-- Do not run from CI. Do not apply from the app.
--
-- payment_rail is not an entitlement, not a provider transaction, and not Apple vs Google.
-- NULL stays valid until the first rail-specific action.
-- This migration does not infer store, and it does not start a purchase.

BEGIN;

ALTER TABLE public.service_request_claims
  ADD COLUMN IF NOT EXISTS payment_rail text NULL;

COMMENT ON COLUMN public.service_request_claims.payment_rail IS
  'Which payment sequence owns this reserved claim: stripe or store. NULL until the first rail-specific action. Not an entitlement, not payment success, and not the Apple or Google provider.';

ALTER TABLE public.service_request_claims
  DROP CONSTRAINT IF EXISTS service_request_claims_payment_rail_check;

ALTER TABLE public.service_request_claims
  ADD CONSTRAINT service_request_claims_payment_rail_check CHECK (
    payment_rail IS NULL OR payment_rail IN ('stripe', 'store')
  );

-- Stripe evidence only. A missing store payment is not Stripe proof.
UPDATE public.service_request_claims AS claim
SET payment_rail = 'stripe'
WHERE claim.payment_rail IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.request_offer_payments AS payment
    WHERE payment.service_request_claim_id = claim.id
      AND (
        payment.provider = 'stripe'
        OR length(trim(coalesce(payment.stripe_payment_intent_id, ''))) > 0
      )
  );

COMMIT;
