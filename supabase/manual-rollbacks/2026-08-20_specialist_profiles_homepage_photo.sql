-- Rollback for 2026-08-20_specialist_profiles_homepage_photo.sql
-- Drops the additive homepage-photo columns only.
-- Does not touch photo_url / avatar_url / photo_focus / Storage.

BEGIN;

ALTER TABLE public.specialist_profiles
  DROP COLUMN IF EXISTS homepage_photo,
  DROP COLUMN IF EXISTS homepage_photo_url,
  DROP COLUMN IF EXISTS photo_source_url;

COMMIT;
