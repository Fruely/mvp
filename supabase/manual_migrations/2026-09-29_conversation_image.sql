-- Conversation photo attachment.
-- Manual migration. Apply on staging, then production, only after the
-- backend that accepts kind=image is deployed.
-- This file does not run by itself. Do not apply it from the app.
--
-- Purpose:
--   * allow conversation message kind image
--   * keep system, text, audio, and location rules unchanged
--   * keep the existing conversation_message_attachments constraints
--   * allow image/jpeg in the private conversation-media bucket
--
-- The message API accepts only image/jpeg. The attachment check from
-- 2026-09-28 still lists png and webp; this migration does not widen
-- or narrow that check.
--
-- Production storage steps, after this SQL is applied by an operator:
--   1. Confirm storage.buckets.id = conversation-media, public = false,
--      file_size_limit = 10485760, and allowed MIME types are the existing
--      audio types plus image/jpeg.
--   2. Do not add a public read policy.
--   3. Do not grant anon or authenticated direct access to the bucket.

BEGIN;

ALTER TABLE public.conversation_messages DROP CONSTRAINT IF EXISTS conversation_messages_shape_check;
ALTER TABLE public.conversation_messages DROP CONSTRAINT IF EXISTS conversation_messages_kind_check;

ALTER TABLE public.conversation_messages
  ADD CONSTRAINT conversation_messages_kind_check
  CHECK (kind IN ('system', 'text', 'audio', 'location', 'image'));

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
    OR (kind = 'image' AND body IS NULL AND actor_type IN ('client', 'specialist') AND author_user_id IS NOT NULL)
  );

UPDATE storage.buckets
SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'image/jpeg']::text[]
WHERE id = 'conversation-media';

COMMIT;
