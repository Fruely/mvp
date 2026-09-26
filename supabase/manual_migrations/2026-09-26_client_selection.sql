-- Client return, selection and conversation foundation.
-- Apply ONLY after:
--   1. 2026-09-26_service_request_matches.sql
--   2. 2026-09-26_freuly_inbox_delivery.sql
-- Manual. Do not run from CI and do not apply to production from the app.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.service_request_matches') IS NULL
     OR to_regclass('public.inbox_items') IS NULL
     OR to_regclass('public.notification_outbox') IS NULL THEN
    RAISE EXCEPTION 'Apply the match migration and 2026-09-26_freuly_inbox_delivery.sql before 2026-09-26_client_selection.sql';
  END IF;
END $$;

ALTER TABLE public.service_request_matches
  DROP CONSTRAINT IF EXISTS service_request_matches_status_check;

ALTER TABLE public.service_request_matches
  ADD CONSTRAINT service_request_matches_status_check
  CHECK (status IN ('active', 'interested', 'declined', 'expired', 'selected', 'not_selected'));

CREATE UNIQUE INDEX IF NOT EXISTS service_request_matches_one_selected
  ON public.service_request_matches (service_request_id)
  WHERE status = 'selected';

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS selected_specialist_id uuid NULL REFERENCES public.specialists (id),
  ADD COLUMN IF NOT EXISTS selected_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_specialist_response_at timestamptz;

ALTER TABLE public.inbox_items
  ALTER COLUMN recipient_user_id DROP NOT NULL;

ALTER TABLE public.inbox_items
  ADD COLUMN IF NOT EXISTS service_request_id uuid NULL REFERENCES public.service_requests (id) ON DELETE CASCADE;

ALTER TABLE public.inbox_items
  DROP CONSTRAINT IF EXISTS inbox_items_recipient_present;

ALTER TABLE public.inbox_items
  ADD CONSTRAINT inbox_items_recipient_present
  CHECK (recipient_user_id IS NOT NULL OR service_request_id IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.service_request_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL REFERENCES public.service_requests (id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CONSTRAINT service_request_access_tokens_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_service_request_access_tokens_request
  ON public.service_request_access_tokens (service_request_id);

COMMENT ON TABLE public.service_request_access_tokens IS
  'Opaque return capability for an anonymous request. Only the hash is stored.';

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL REFERENCES public.service_requests (id) ON DELETE CASCADE,
  specialist_id uuid NOT NULL REFERENCES public.specialists (id),
  client_user_id uuid NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversations_request_unique UNIQUE (service_request_id),
  CONSTRAINT conversations_status_check CHECK (status IN ('open'))
);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  kind text NOT NULL,
  actor_type text NOT NULL,
  author_user_id uuid NULL,
  body text NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversation_messages_kind_check CHECK (kind IN ('system', 'text')),
  CONSTRAINT conversation_messages_actor_check CHECK (actor_type IN ('system', 'client', 'specialist')),
  CONSTRAINT conversation_messages_shape_check CHECK (
    (kind = 'system' AND body IS NULL AND actor_type = 'system' AND author_user_id IS NULL)
    OR (kind = 'text' AND body IS NOT NULL AND length(trim(body)) > 0 AND actor_type IN ('client', 'specialist'))
  )
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation
  ON public.conversation_messages (conversation_id, created_at);

ALTER TABLE public.service_request_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.service_request_access_tokens FROM anon, authenticated;
REVOKE ALL ON public.conversations FROM anon, authenticated;
REVOKE ALL ON public.conversation_messages FROM anon, authenticated;

GRANT ALL ON public.service_request_access_tokens TO service_role;
GRANT SELECT ON public.conversations TO authenticated;
GRANT SELECT ON public.conversation_messages TO authenticated;
GRANT ALL ON public.conversations TO service_role;
GRANT ALL ON public.conversation_messages TO service_role;

DROP POLICY IF EXISTS conversations_select_participant ON public.conversations;
CREATE POLICY conversations_select_participant
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    client_user_id = auth.uid()
    OR specialist_id IN (
      SELECT id FROM public.specialists WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS conversation_messages_select_participant ON public.conversation_messages;
CREATE POLICY conversation_messages_select_participant
  ON public.conversation_messages
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE client_user_id = auth.uid()
         OR specialist_id IN (
           SELECT id FROM public.specialists WHERE user_id = auth.uid()
         )
    )
  );

COMMIT;
