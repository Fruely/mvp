-- Rollback for 2026-08-19_specialist_profiles_photo_focus.sql
-- Drops the additive column only. Does not touch photo_url / avatar_url / Storage.

BEGIN;

ALTER TABLE public.specialist_profiles
  DROP COLUMN IF EXISTS photo_focus;

COMMIT;
