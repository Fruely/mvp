-- Claim flow: one-time token for specialist first access (48h TTL).
-- Run in Supabase SQL Editor if specialists table does not have these columns.

ALTER TABLE specialists
  ADD COLUMN IF NOT EXISTS claim_token text,
  ADD COLUMN IF NOT EXISTS claim_token_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS claim_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS claim_token_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_set_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_specialists_claim_token
  ON specialists (claim_token)
  WHERE claim_token IS NOT NULL;

COMMENT ON COLUMN specialists.claim_token IS 'One-time token for claim link (48h). Null after use or expiry.';
COMMENT ON COLUMN specialists.claim_token_used_at IS 'Set when specialist completed first login (set password).';
COMMENT ON COLUMN specialists.password_set_at IS 'When specialist set password (GDPR-friendly persistent access).';
