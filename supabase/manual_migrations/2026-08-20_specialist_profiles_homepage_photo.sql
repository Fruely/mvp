-- Additive homepage-card photo contract (canonical 31:20 derivative).
-- Manual migration. Do NOT apply from CI. Do NOT run until reviewed.
-- Does not rewrite existing rows. Does not touch MAIN photo columns.
-- Application homepage rendering stays on existing MAIN merge until a later eligibility phase.

BEGIN;

ALTER TABLE public.specialist_profiles
  ADD COLUMN IF NOT EXISTS photo_source_url text,
  ADD COLUMN IF NOT EXISTS homepage_photo_url text,
  ADD COLUMN IF NOT EXISTS homepage_photo jsonb;

COMMENT ON COLUMN public.specialist_profiles.photo_source_url IS
  'Original uncropped MAIN-photo source object URL. Editor source of truth. Null = no homepage-editor source stored. Independent from specialists.avatar_url / specialist_profiles.photo_url.';

COMMENT ON COLUMN public.specialist_profiles.homepage_photo_url IS
  'Generated canonical homepage-card image (1550x1000, 31:20). Homepage recommended cards only after eligibility rollout. Null = not homepage-photo-eligible. Must not be used as profile/search/list MAIN.';

COMMENT ON COLUMN public.specialist_profiles.homepage_photo IS
  'Nullable crop/source/output metadata for homepage_photo_url (version 1). Fail closed in application parsers. Must be nulled together with homepage_photo_url when photo_source_url is replaced. Unrelated to photo_focus.';

COMMIT;
