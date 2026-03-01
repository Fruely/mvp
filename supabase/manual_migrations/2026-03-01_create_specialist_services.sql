-- Manual migration record (production hardening)
-- Purpose: persist specialist_services schema to prevent DB drift
-- Note: keep aligned with the SQL already executed in production

CREATE TABLE IF NOT EXISTS public.specialist_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES public.specialists(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  pricing_type text NOT NULL CHECK (pricing_type IN ('fixed', 'range', 'hourly')),
  price_from numeric(10, 2) NOT NULL CHECK (price_from >= 0),
  price_to numeric(10, 2),
  currency text NOT NULL DEFAULT 'EUR',
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT specialist_services_range_requires_price_to
    CHECK (pricing_type <> 'range' OR price_to IS NOT NULL),
  CONSTRAINT specialist_services_price_to_ge_from
    CHECK (price_to IS NULL OR price_to >= price_from)
);

CREATE INDEX IF NOT EXISTS idx_specialist_services_specialist_id
ON public.specialist_services (specialist_id);

CREATE INDEX IF NOT EXISTS idx_specialist_services_specialist_active
ON public.specialist_services (specialist_id, is_active);

CREATE INDEX IF NOT EXISTS idx_specialist_services_created_at
ON public.specialist_services (created_at DESC);

CREATE OR REPLACE FUNCTION set_specialist_services_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_specialist_services_updated_at
ON public.specialist_services;

CREATE TRIGGER trg_specialist_services_updated_at
BEFORE UPDATE ON public.specialist_services
FOR EACH ROW
EXECUTE FUNCTION set_specialist_services_updated_at();
