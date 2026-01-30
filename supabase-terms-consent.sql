-- B2B terms consent: record when and which version was accepted.
-- Run in Supabase SQL Editor if specialists table does not have these columns.

ALTER TABLE specialists
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text;

COMMENT ON COLUMN specialists.terms_accepted_at IS 'When the specialist accepted the current terms (B2B consent).';
COMMENT ON COLUMN specialists.terms_version IS 'Version of terms accepted (e.g. 1.0).';
