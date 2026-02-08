-- Add certificate_urls to specialist_profiles (array of image URLs).
-- Run in Supabase SQL Editor if the column does not exist.

ALTER TABLE specialist_profiles
  ADD COLUMN IF NOT EXISTS certificate_urls text[] DEFAULT '{}';

COMMENT ON COLUMN specialist_profiles.certificate_urls IS 'URLs of certificate/qualification images (displayed on public card).';
