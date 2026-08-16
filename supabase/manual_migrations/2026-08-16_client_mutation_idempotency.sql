-- Client mutation idempotency for public lead and service-request creation.
-- Nullable for legacy rows; UNIQUE applies only when key is present.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS client_idempotency_key text,
  ADD COLUMN IF NOT EXISTS client_idempotency_fingerprint text;

COMMENT ON COLUMN public.leads.client_idempotency_key IS
  'Optional client-supplied idempotency key for safe POST retries from Native/Web public forms.';
COMMENT ON COLUMN public.leads.client_idempotency_fingerprint IS
  'Stable hash of canonical create payload; mismatched replay with same key must be rejected.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_client_idempotency_key
  ON public.leads (client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS client_idempotency_key text,
  ADD COLUMN IF NOT EXISTS client_idempotency_fingerprint text;

COMMENT ON COLUMN public.service_requests.client_idempotency_key IS
  'Optional client-supplied idempotency key for safe POST retries from Native/Web public forms.';
COMMENT ON COLUMN public.service_requests.client_idempotency_fingerprint IS
  'Stable hash of canonical create payload; mismatched replay with same key must be rejected.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_requests_client_idempotency_key
  ON public.service_requests (client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;
