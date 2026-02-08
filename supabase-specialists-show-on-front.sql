-- Make already approved specialists visible on the front (list and cards).
-- Run in Supabase SQL Editor if you have approved specialists that don't appear.

UPDATE specialists
SET is_active = true, is_visible = true
WHERE status = 'approved' AND (is_active = false OR is_visible = false);
