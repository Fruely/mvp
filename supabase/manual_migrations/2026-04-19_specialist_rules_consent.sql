-- Specialist placement rules: consent timestamps and version (application + registered specialist)
ALTER TABLE specialist_applications
  ADD COLUMN IF NOT EXISTS specialist_rules_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS specialist_rules_version text;

COMMENT ON COLUMN specialist_applications.specialist_rules_accepted_at IS 'When the applicant accepted the specialist placement rules.';
COMMENT ON COLUMN specialist_applications.specialist_rules_version IS 'Version string of the rules at acceptance (e.g. env SPECIALIST_RULES_VERSION).';

ALTER TABLE specialists
  ADD COLUMN IF NOT EXISTS specialist_rules_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS specialist_rules_version text;

COMMENT ON COLUMN specialists.specialist_rules_accepted_at IS 'When the specialist accepted the placement rules at registration.';
COMMENT ON COLUMN specialists.specialist_rules_version IS 'Version string of the rules at acceptance.';
