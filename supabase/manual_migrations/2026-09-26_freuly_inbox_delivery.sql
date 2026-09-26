-- Freuly Inbox and match delivery.
-- Apply ONLY after 2026-09-26_service_request_matches.sql.
-- Manual. Do not run from CI and do not apply to production from the app.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.service_request_matches') IS NULL THEN
    RAISE EXCEPTION 'Apply 2026-09-26_service_request_matches.sql before 2026-09-26_freuly_inbox_delivery.sql';
  END IF;
END $$;

ALTER TABLE public.service_request_matches
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_notified_at timestamptz;

ALTER TABLE public.specialists
  ADD COLUMN IF NOT EXISTS notification_locale text;

COMMENT ON COLUMN public.specialists.notification_locale IS
  'Recipient interface locale for external notification copy. Null uses the delivery default. Independent of the client locale.';

ALTER TABLE public.service_request_matches
  DROP CONSTRAINT IF EXISTS service_request_matches_status_check;

ALTER TABLE public.service_request_matches
  ADD CONSTRAINT service_request_matches_status_check
  CHECK (status IN ('active', 'interested', 'declined', 'expired'));

COMMENT ON COLUMN public.service_request_matches.status IS
  'active = waiting for a specialist response. interested/declined stop reminders. expired is reserved.';

CREATE TABLE IF NOT EXISTS public.inbox_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL,
  type text NOT NULL,
  actor_type text NOT NULL DEFAULT 'system',
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  dedupe_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  opened_at timestamptz,
  actioned_at timestamptz,
  CONSTRAINT inbox_items_dedupe_key_unique UNIQUE (dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_inbox_items_recipient_created
  ON public.inbox_items (recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbox_items_recipient_unread
  ON public.inbox_items (recipient_user_id)
  WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inbox_item_id uuid NOT NULL REFERENCES public.inbox_items (id) ON DELETE CASCADE,
  match_id uuid,
  recipient_user_id uuid NOT NULL,
  channel text NOT NULL,
  dedupe_key text NOT NULL,
  -- sent means the provider accepted the message. It is not proof the specialist opened it.
  status text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_outbox_dedupe_key_unique UNIQUE (dedupe_key),
  CONSTRAINT notification_outbox_status_check CHECK (
    status IN ('pending', 'processing', 'sent', 'failed', 'retryable', 'cancelled', 'skipped')
  )
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_due
  ON public.notification_outbox (status, next_attempt_at);

CREATE TABLE IF NOT EXISTS public.notification_delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id uuid NOT NULL REFERENCES public.notification_outbox (id) ON DELETE CASCADE,
  attempt integer NOT NULL,
  status text NOT NULL,
  provider_message_id text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  error_code text,
  CONSTRAINT notification_delivery_attempts_unique UNIQUE (outbox_id, attempt)
);

ALTER TABLE public.inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_attempts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.inbox_items FROM anon, authenticated;
REVOKE ALL ON public.notification_outbox FROM anon, authenticated;
REVOKE ALL ON public.notification_delivery_attempts FROM anon, authenticated;

GRANT SELECT ON public.inbox_items TO authenticated;
GRANT ALL ON public.inbox_items TO service_role;
GRANT ALL ON public.notification_outbox TO service_role;
GRANT ALL ON public.notification_delivery_attempts TO service_role;

DROP POLICY IF EXISTS inbox_items_select_own ON public.inbox_items;
CREATE POLICY inbox_items_select_own
  ON public.inbox_items
  FOR SELECT
  TO authenticated
  USING (recipient_user_id = auth.uid());

COMMIT;
