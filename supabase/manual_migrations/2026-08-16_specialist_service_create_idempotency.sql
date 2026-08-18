-- Idempotent specialist service creation for Native safe POST retries.
-- Nullable for legacy rows; UNIQUE applies only when key is present.

ALTER TABLE public.specialist_services
  ADD COLUMN IF NOT EXISTS client_idempotency_key text,
  ADD COLUMN IF NOT EXISTS client_idempotency_fingerprint text,
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

COMMENT ON COLUMN public.specialist_services.client_idempotency_key IS
  'Optional client-supplied idempotency key for safe service POST retries from Native.';
COMMENT ON COLUMN public.specialist_services.client_idempotency_fingerprint IS
  'Stable hash of canonical create payload; mismatched replay with same key must be rejected.';
COMMENT ON COLUMN public.specialist_services.owner_user_id IS
  'Auth user that created the row; used for idempotency ownership checks.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_specialist_services_client_idempotency_key
  ON public.specialist_services (client_idempotency_key)
  WHERE client_idempotency_key IS NOT NULL;
