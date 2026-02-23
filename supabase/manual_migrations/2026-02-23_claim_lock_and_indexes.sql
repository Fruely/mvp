-- Manual migration (already applied in production)
-- Purpose: Safe claim flow CAS lock + indexes
-- Applied via Supabase SQL Editor

ALTER TABLE public.specialists
ADD COLUMN IF NOT EXISTS claim_processing_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_specialists_claim_token
ON public.specialists (claim_token);

CREATE INDEX IF NOT EXISTS idx_specialists_claim_active
ON public.specialists (claim_token_expires_at)
WHERE claim_token IS NOT NULL
AND claim_token_used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_specialists_claim_processing_notnull
ON public.specialists (claim_processing_at)
WHERE claim_processing_at IS NOT NULL;
