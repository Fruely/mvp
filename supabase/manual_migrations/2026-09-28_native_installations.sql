-- Authenticated Freuly native installations.
-- One installation_id has one current user. Account switch updates that row.
-- Delivery credentials are not stored here. There is no last_seen expiry in this MVP:
-- uninstall without logout can leave active=true until a later policy.
-- Apply manually. Do not run from CI and do not apply from the app.
-- Matching stays behind SERVICE_REQUEST_MATCHING_ENABLED.

BEGIN;

CREATE TABLE IF NOT EXISTS public.native_installations (
  installation_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  platform text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  registered_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  deactivated_at timestamptz,
  CONSTRAINT native_installations_platform_check CHECK (platform IN ('ios', 'android'))
);

CREATE INDEX IF NOT EXISTS idx_native_installations_user_active
  ON public.native_installations (user_id)
  WHERE active = true;

COMMENT ON TABLE public.native_installations IS
  'One current account per native installation. Active means live-market participation, not push permission. Uninstall without logout is not observed yet.';

ALTER TABLE public.native_installations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.native_installations FROM anon, authenticated;
GRANT ALL ON public.native_installations TO service_role;

COMMIT;
