-- Stripe billing webhook idempotency + customer mapping for partner commission flow.
-- Manual migration — apply on staging before production.

BEGIN;

CREATE TABLE IF NOT EXISTS public.billing_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES public.specialists (id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'stripe',
  provider_customer_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_customers_provider_customer_unique UNIQUE (provider, provider_customer_id),
  CONSTRAINT billing_customers_specialist_provider_unique UNIQUE (specialist_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_billing_customers_specialist_id
  ON public.billing_customers (specialist_id);

COMMENT ON TABLE public.billing_customers IS
  'Maps payment provider customer ids to specialist_id for webhook resolution.';

CREATE TABLE IF NOT EXISTS public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'stripe',
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  processing_status text NOT NULL DEFAULT 'pending',
  processed_at timestamptz NULL,
  processing_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_events_processing_status_check CHECK (
    processing_status IN ('pending', 'processed', 'failed', 'skipped')
  ),
  CONSTRAINT billing_events_provider_event_unique UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_events_type_created
  ON public.billing_events (event_type, created_at DESC);

COMMENT ON TABLE public.billing_events IS
  'Idempotent Stripe webhook event ledger. One row per provider event id.';

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.billing_customers FROM anon, authenticated;
REVOKE ALL ON public.billing_events FROM anon, authenticated;

GRANT ALL ON public.billing_customers TO service_role;
GRANT ALL ON public.billing_events TO service_role;

COMMIT;
