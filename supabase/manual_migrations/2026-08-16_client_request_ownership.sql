-- Authenticated client ownership for leads and service_requests.
-- Nullable: legacy and anonymous rows remain unowned (client_user_id IS NULL).
-- Apply before deploying routes that write/read client_user_id.

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

-- Re-scope idempotency keys by owner so the same key cannot cross authenticated owners.
DROP INDEX IF EXISTS public.uq_leads_client_idempotency_key;
DROP INDEX IF EXISTS public.uq_service_requests_client_idempotency_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_client_idempotency_key_anonymous
  ON public.leads (client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL AND client_user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_client_idempotency_key_owned
  ON public.leads (client_user_id, client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL AND client_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_requests_client_idempotency_key_anonymous
  ON public.service_requests (client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL AND client_user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_requests_client_idempotency_key_owned
  ON public.service_requests (client_user_id, client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL AND client_user_id IS NOT NULL;

COMMIT;
