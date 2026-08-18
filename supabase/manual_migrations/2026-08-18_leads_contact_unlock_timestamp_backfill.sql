-- Backfill historical implicit contact reveals.
-- Apply manually in Supabase SQL editor. Do not auto-run from CI/Cursor.
--
-- Why: contact visibility is now timestamp-only (`contact_unlocked_at`).
-- Previously accepted/contacted/closed leads could show contacts without a
-- timestamp. Removing that bypass would re-mask already-delivered contacts
-- unless those rows are backfilled.
--
-- Non-destructive: only writes contact_unlocked_at when it is currently NULL.
-- Does not change status, message, or contact field values.

BEGIN;

UPDATE public.leads
SET contact_unlocked_at = COALESCE(contact_unlocked_at, created_at, now())
WHERE contact_unlocked_at IS NULL
  AND lower(coalesce(status, '')) IN ('accepted', 'contacted', 'closed');

COMMIT;
