-- Authenticated client ownership for leads and service_requests.
-- PREREQUISITE: apply 2026-08-16_client_mutation_idempotency.sql first
-- (client_idempotency_key columns + global partial UNIQUE indexes must exist).
-- This migration adds ownership columns only; it does NOT re-scope idempotency indexes.
-- Global UNIQUE(client_idempotency_key) remains the duplicate-prevention invariant.

BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS client_user_id uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL;

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS client_user_id uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.leads.client_user_id IS
  'Verified Supabase auth user who submitted the lead while authenticated; NULL for anonymous submissions.';

COMMENT ON COLUMN public.service_requests.client_user_id IS
  'Verified Supabase auth user who submitted the assisted request while authenticated; NULL for anonymous submissions.';

CREATE INDEX IF NOT EXISTS idx_leads_client_user_created_at
  ON public.leads (client_user_id, created_at DESC)
  WHERE client_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_service_requests_client_user_created_at
  ON public.service_requests (client_user_id, created_at DESC)
  WHERE client_user_id IS NOT NULL;

COMMIT;
