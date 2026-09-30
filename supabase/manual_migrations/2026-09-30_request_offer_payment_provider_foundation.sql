-- Additive provider identity for request_offer_payments.
-- Apply manually, after 2026-09-29_service_request_client_confirmation.sql.
-- Apply this migration before deploying runtime that reads or writes these columns.
-- Do not run from CI. Do not apply from the app.
--
-- Existing Stripe columns and paid-row checks stay in force.
-- This migration does not verify Apple or Google purchases, and it does not
-- make status = paid valid without the existing Stripe origin checks.

BEGIN;

ALTER TABLE public.request_offer_payments
  ADD COLUMN IF NOT EXISTS provider text NULL,
  ADD COLUMN IF NOT EXISTS provider_transaction_id text NULL,
  ADD COLUMN IF NOT EXISTS provider_product_id text NULL,
  ADD COLUMN IF NOT EXISTS provider_verification_status text NULL,
  ADD COLUMN IF NOT EXISTS provider_environment text NULL;

COMMENT ON COLUMN public.request_offer_payments.provider IS
  'Payment rail that owns this row: stripe, apple, or google. Null remains valid for historical rows that have no provider evidence. Not an entitlement and not a replacement for request_offer_payments.status.';

COMMENT ON COLUMN public.request_offer_payments.provider_transaction_id IS
  'Provider settlement identity used for idempotency. For Stripe this is the PaymentIntent id, never the Checkout session id. Null until that identity exists. Not an entitlement.';

COMMENT ON COLUMN public.request_offer_payments.provider_product_id IS
  'Store product id when the rail sells a catalog product. Null for Stripe PaymentIntent rows. Not an entitlement.';

COMMENT ON COLUMN public.request_offer_payments.provider_verification_status IS
  'Server-side provider verification state: pending, verified, or rejected. Null for current Stripe rows whose webhook already settles the payment. Separate from request_offer_payments.status. Not an entitlement.';

COMMENT ON COLUMN public.request_offer_payments.provider_environment IS
  'production or sandbox, so a test store transaction cannot satisfy production. Null for current and historical Stripe rows. Not inferred from client input.';

ALTER TABLE public.request_offer_payments
  DROP CONSTRAINT IF EXISTS request_offer_payments_provider_check;

ALTER TABLE public.request_offer_payments
  ADD CONSTRAINT request_offer_payments_provider_check CHECK (
    provider IS NULL OR provider IN ('stripe', 'apple', 'google')
  );

ALTER TABLE public.request_offer_payments
  DROP CONSTRAINT IF EXISTS request_offer_payments_provider_transaction_id_check;

ALTER TABLE public.request_offer_payments
  ADD CONSTRAINT request_offer_payments_provider_transaction_id_check CHECK (
    provider_transaction_id IS NULL OR length(trim(provider_transaction_id)) > 0
  );

ALTER TABLE public.request_offer_payments
  DROP CONSTRAINT IF EXISTS request_offer_payments_provider_product_id_check;

ALTER TABLE public.request_offer_payments
  ADD CONSTRAINT request_offer_payments_provider_product_id_check CHECK (
    provider_product_id IS NULL OR length(trim(provider_product_id)) > 0
  );

ALTER TABLE public.request_offer_payments
  DROP CONSTRAINT IF EXISTS request_offer_payments_provider_verification_status_check;

ALTER TABLE public.request_offer_payments
  ADD CONSTRAINT request_offer_payments_provider_verification_status_check CHECK (
    provider_verification_status IS NULL
    OR provider_verification_status IN ('pending', 'verified', 'rejected')
  );

ALTER TABLE public.request_offer_payments
  DROP CONSTRAINT IF EXISTS request_offer_payments_provider_environment_check;

ALTER TABLE public.request_offer_payments
  ADD CONSTRAINT request_offer_payments_provider_environment_check CHECK (
    provider_environment IS NULL OR provider_environment IN ('production', 'sandbox')
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_request_offer_payments_provider_transaction
  ON public.request_offer_payments (
    provider,
    COALESCE(provider_environment, ''),
    provider_transaction_id
  )
  WHERE provider IS NOT NULL
    AND provider_transaction_id IS NOT NULL;

-- Stripe evidence may tag the rail. It must not invent a transaction id
-- from a Checkout session id or a charge id, and it must not change money or status.
UPDATE public.request_offer_payments
SET provider = 'stripe'
WHERE provider IS NULL
  AND (
    length(trim(coalesce(stripe_checkout_session_id, ''))) > 0
    OR length(trim(coalesce(stripe_payment_intent_id, ''))) > 0
    OR length(trim(coalesce(stripe_charge_id, ''))) > 0
  );

UPDATE public.request_offer_payments
SET provider_transaction_id = stripe_payment_intent_id
WHERE provider_transaction_id IS NULL
  AND stripe_payment_intent_id IS NOT NULL
  AND length(trim(stripe_payment_intent_id)) > 0;

COMMIT;
