-- Minimal lead tracking: scenario, in-page path, external referrer
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_path text,
  ADD COLUMN IF NOT EXISTS referrer text;

COMMENT ON COLUMN leads.source IS 'Lead scenario label (e.g. specialist_profile).';
COMMENT ON COLUMN leads.source_path IS 'In-app pathname when the lead was submitted.';
COMMENT ON COLUMN leads.referrer IS 'document.referrer when available (external source).';
