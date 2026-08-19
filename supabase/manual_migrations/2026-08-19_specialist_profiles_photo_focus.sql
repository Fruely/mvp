-- Additive MAIN-photo focus metadata (smart crop foundation).
-- Manual migration. Do NOT apply from CI. Do NOT run until reviewed.
-- Does not rewrite existing rows. Existing writes omit this column and stay valid.
-- Application cover rendering stays contain until an explicit later enablement step.

BEGIN;

ALTER TABLE public.specialist_profiles
  ADD COLUMN IF NOT EXISTS photo_focus jsonb;

COMMENT ON COLUMN public.specialist_profiles.photo_focus IS
  'Nullable smart-crop focus for the MAIN profile photo. Null = unanalyzed or invalidated. Must be ignored when photo_identity does not match the displayed photo. Cover rendering is gated in application code and must stay contain until explicitly enabled.';

COMMIT;
