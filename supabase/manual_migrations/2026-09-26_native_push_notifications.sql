-- Push endpoints and service-notification preferences.
-- Apply ONLY after:
--   1. 2026-09-26_service_request_matches.sql
--   2. 2026-09-26_freuly_inbox_delivery.sql
--   3. 2026-09-26_client_selection.sql
-- Manual. Do not run from CI and do not apply to production from the app.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.inbox_items') IS NULL
     OR to_regclass('public.notification_outbox') IS NULL
     OR to_regclass('public.notification_delivery_attempts') IS NULL
     OR to_regclass('public.conversations') IS NULL THEN
    RAISE EXCEPTION 'Apply the inbox and client selection migrations before 2026-09-26_native_push_notifications.sql';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.push_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  provider text NOT NULL DEFAULT 'expo',
  token text,
  token_hash text NOT NULL,
  device_id text NOT NULL,
  locale text,
  time_zone text,
  enabled boolean NOT NULL DEFAULT true,
  permission_state text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  invalidated_at timestamptz,
  CONSTRAINT push_endpoints_platform_check CHECK (platform IN ('ios', 'android')),
  CONSTRAINT push_endpoints_provider_check CHECK (provider IN ('expo')),
  CONSTRAINT push_endpoints_permission_check CHECK (permission_state IN ('unknown', 'granted', 'denied')),
  CONSTRAINT push_endpoints_token_hash_unique UNIQUE (token_hash),
  CONSTRAINT push_endpoints_user_device_unique UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_push_endpoints_user_active
  ON public.push_endpoints (user_id)
  WHERE enabled = true AND invalidated_at IS NULL;

COMMENT ON TABLE public.push_endpoints IS
  'One row per authenticated device. The raw token is a delivery credential and is not a log field.';

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY,
  push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  telegram_enabled boolean NOT NULL DEFAULT true,
  match_notifications boolean NOT NULL DEFAULT true,
  selection_notifications boolean NOT NULL DEFAULT true,
  reminder_notifications boolean NOT NULL DEFAULT true,
  time_zone text,
  notification_locale text,
  marketing_consent boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_preferences_marketing_false CHECK (marketing_consent = false)
);

COMMENT ON TABLE public.notification_preferences IS
  'Service workflow transports. Marketing consent stays false; Inbox history is not a preference.';

ALTER TABLE public.inbox_items
  ADD COLUMN IF NOT EXISTS push_tapped_at timestamptz;

-- Anonymous client events keep an inbox row without auth.uid and still need an email outbox row.
ALTER TABLE public.notification_outbox
  ALTER COLUMN recipient_user_id DROP NOT NULL;

ALTER TABLE public.notification_delivery_attempts
  ADD COLUMN IF NOT EXISTS endpoint_id uuid,
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS platform text;

ALTER TABLE public.notification_delivery_attempts
  DROP CONSTRAINT IF EXISTS notification_delivery_attempts_unique;

CREATE UNIQUE INDEX IF NOT EXISTS notification_delivery_attempts_endpoint_unique
  ON public.notification_delivery_attempts (
    outbox_id,
    attempt,
    COALESCE(endpoint_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

ALTER TABLE public.push_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.push_endpoints FROM anon, authenticated;
REVOKE ALL ON public.notification_preferences FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.push_endpoints TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.push_endpoints TO service_role;
GRANT ALL ON public.notification_preferences TO service_role;

DROP POLICY IF EXISTS push_endpoints_select_own ON public.push_endpoints;
CREATE POLICY push_endpoints_select_own
  ON public.push_endpoints
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS push_endpoints_insert_own ON public.push_endpoints;
CREATE POLICY push_endpoints_insert_own
  ON public.push_endpoints
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS push_endpoints_update_own ON public.push_endpoints;
CREATE POLICY push_endpoints_update_own
  ON public.push_endpoints
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notification_preferences_select_own ON public.notification_preferences;
CREATE POLICY notification_preferences_select_own
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notification_preferences_insert_own ON public.notification_preferences;
CREATE POLICY notification_preferences_insert_own
  ON public.notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS notification_preferences_update_own ON public.notification_preferences;
CREATE POLICY notification_preferences_update_own
  ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
