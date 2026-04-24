-- Optional end of grace period for subscription UX (additive).
ALTER TABLE public.specialist_plan
  ADD COLUMN IF NOT EXISTS grace_until timestamptz;
