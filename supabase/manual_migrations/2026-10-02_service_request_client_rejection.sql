-- Serialize the owning client's confirm and reject decisions on one reserved claim.
-- Apply manually, after 2026-10-02_service_request_confirmation_deadline.sql.
-- Apply this migration before deploying runtime that reads or writes client_rejected_at.
-- Do not run from CI. Do not apply from the app.
-- Do not edit earlier service-request claim migrations. They are already applied.
--
-- Additive. Existing rows stay NULL. This migration does not backfill a decision,
-- cancel a PaymentIntent, release a claim, or rematch a request.

BEGIN;

ALTER TABLE public.service_request_claims
  ADD COLUMN IF NOT EXISTS client_rejected_at timestamptz NULL;

COMMENT ON COLUMN public.service_request_claims.client_rejected_at IS
  'The owning client explicitly rejected this reserved specialist before connection. Audit timestamp only. No client identity and no free-text reason.';

ALTER TABLE public.service_request_claims
  DROP CONSTRAINT IF EXISTS service_request_claims_one_client_decision;

ALTER TABLE public.service_request_claims
  ADD CONSTRAINT service_request_claims_one_client_decision CHECK (
    client_confirmed_at IS NULL OR client_rejected_at IS NULL
  );

COMMIT;
