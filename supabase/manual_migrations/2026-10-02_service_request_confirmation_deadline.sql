-- Absolute client-confirmation deadline for one reserved service-request claim.
-- Apply manually, after 2026-09-30_service_request_claim_payment_rail.sql.
-- Apply this migration before deploying runtime that reads or writes confirmation_expires_at.
-- Do not run from CI. Do not apply from the app.
--
-- Additive. Existing rows stay NULL. This migration does not invent a deadline,
-- cancel a PaymentIntent, or mark a claim expired.

BEGIN;

ALTER TABLE public.service_request_claims
  ADD COLUMN IF NOT EXISTS confirmation_expires_at timestamptz NULL;

COMMENT ON COLUMN public.service_request_claims.confirmation_expires_at IS
  'Absolute server time after which the owning client can no longer confirm this reserved connection. Set once when a canonical Stripe authorization becomes authoritative. Not a duration and not a client input.';

COMMIT;
