-- Conversation audio and one-time location.
-- Manual migration. Apply on staging, then production, only after the
-- matching-inbox-push backend that reads these tables is deployed.
-- This file does not run by itself. Do not apply it from the app.
--
-- Purpose:
--   * allow conversation message kinds audio and location
--   * keep system rows server-shaped and text rows unchanged
--   * store one private attachment per audio message
--   * leave image as a constrained attachment media_type with no writer yet
--   * create the private conversation-media bucket
--
-- Production storage steps, after this SQL is applied by an operator:
--   1. Confirm storage.buckets.id = conversation-media, public = false,
--      file_size_limit = 10485760, allowed MIME types are audio/mp4,
--      audio/m4a, audio/x-m4a, and audio/aac.
--   2. Do not add a public read policy.
--   3. Do not grant anon or authenticated direct access to the bucket.
--      Playback and upload use short-lived signed URLs from the service role.
--
-- Orphan uploads: a signed upload that never becomes a message stays private.
-- A later cleanup job may delete conversation/* objects older than 24 hours
-- that have no conversation_message_attachments.storage_path. That job is not
-- part of this migration.

BEGIN;

ALTER TABLE public.conversation_messages DROP CONSTRAINT IF EXISTS conversation_messages_shape_check;
ALTER TABLE public.conversation_messages DROP CONSTRAINT IF EXISTS conversation_messages_kind_check;

ALTER TABLE public.conversation_messages
  ADD CONSTRAINT conversation_messages_kind_check
  CHECK (kind IN ('system', 'text', 'audio', 'location'));

ALTER TABLE public.conversation_messages
  ADD CONSTRAINT conversation_messages_shape_check
  CHECK (
    (kind = 'system' AND body IS NULL AND actor_type = 'system' AND author_user_id IS NULL)
    OR (kind = 'text' AND body IS NOT NULL AND length(trim(body)) > 0 AND actor_type IN ('client', 'specialist'))
    OR (kind = 'audio' AND body IS NULL AND actor_type IN ('client', 'specialist') AND author_user_id IS NOT NULL)
    OR (
      kind = 'location'
      AND body IS NULL
      AND actor_type IN ('client', 'specialist')
      AND author_user_id IS NOT NULL
      AND jsonb_typeof(payload->'latitude') = 'number'
      AND jsonb_typeof(payload->'longitude') = 'number'
      AND (payload->>'latitude')::numeric >= -90
      AND (payload->>'latitude')::numeric <= 90
      AND (payload->>'longitude')::numeric >= -180
      AND (payload->>'longitude')::numeric <= 180
    )
  );

CREATE TABLE IF NOT EXISTS public.conversation_message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.conversation_messages (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  media_type text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  duration_ms integer NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT conversation_message_attachments_message_unique UNIQUE (message_id),
  CONSTRAINT conversation_message_attachments_path_unique UNIQUE (storage_path),
  CONSTRAINT conversation_message_attachments_media_check CHECK (
    (
      media_type = 'audio'
      AND duration_ms IS NOT NULL
      AND duration_ms >= 1
      AND duration_ms <= 180000
      AND size_bytes >= 1
      AND size_bytes <= 10485760
      AND mime_type IN ('audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac')
      AND storage_path ~ '^conversation/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.m4a$'
    )
    OR (
      media_type = 'image'
      AND duration_ms IS NULL
      AND size_bytes >= 1
      AND size_bytes <= 10485760
      AND mime_type IN ('image/jpeg', 'image/png', 'image/webp')
      AND storage_path ~ '^conversation/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_conversation_message_attachments_message
  ON public.conversation_message_attachments (message_id);

COMMENT ON TABLE public.conversation_message_attachments IS
  'Private conversation file metadata. Audio is written now. Image is constrained for a later uploader and is not accepted by the message API.';

ALTER TABLE public.conversation_message_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.conversation_message_attachments FROM anon, authenticated;
GRANT ALL ON public.conversation_message_attachments TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conversation-media',
  'conversation-media',
  false,
  10485760,
  ARRAY['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMIT;
