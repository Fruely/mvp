-- Typed service-pricing exception. Existing rows stay NULL (no exception).
-- price_from remains NOT NULL; exception mode stores 0 and must not be rendered as 0 €.
ALTER TABLE specialist_services
  ADD COLUMN IF NOT EXISTS pricing_exception text NULL;

ALTER TABLE specialist_services
  DROP CONSTRAINT IF EXISTS specialist_services_pricing_exception_check;

ALTER TABLE specialist_services
  ADD CONSTRAINT specialist_services_pricing_exception_check
  CHECK (
    pricing_exception IS NULL
    OR pricing_exception IN ('THIRD_PARTY_FUNDED', 'AFTER_ASSESSMENT')
  );

COMMENT ON COLUMN specialist_services.pricing_exception IS
  'Typed exception allowing an active service without price_from > 0. Supported: THIRD_PARTY_FUNDED, AFTER_ASSESSMENT. NULL = numeric price required.';
