-- Manual migration record:
-- Normalize visibility flags for already-approved specialists, including NULL values.
-- This query may have been run manually in Supabase SQL Editor.

UPDATE specialists
SET is_active = true, is_visible = true
WHERE status = 'approved'
  AND (is_active IS DISTINCT FROM true OR is_visible IS DISTINCT FROM true);
