-- Enforce: one auth user can have at most one specialist profile.
--
-- The partial unique index excludes NULL user_id rows (legacy/unclaimed specialists)
-- so they don't conflict. Only non-null user_id values are constrained.
--
-- Before running: check for existing duplicates:
--   SELECT user_id, count(*) FROM specialists
--   WHERE user_id IS NOT NULL GROUP BY user_id HAVING count(*) > 1;
--
-- If duplicates exist, resolve them manually before applying this migration.

CREATE UNIQUE INDEX IF NOT EXISTS uq_specialists_user_id
  ON public.specialists (user_id)
  WHERE user_id IS NOT NULL;
