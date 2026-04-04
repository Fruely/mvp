-- Optional note next to price (e.g. "per m²", "exact price after inspection")
ALTER TABLE specialist_services
ADD COLUMN IF NOT EXISTS price_comment text;
