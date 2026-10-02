-- Migration Phase 1 — Step 2
-- Progressive Identity compatibility.
-- Specialist drafts are owned by authenticated user_id and must not require contact fields.
-- Email remains an optional contact attribute; no placeholder values are introduced.

ALTER TABLE public.specialists
  ALTER COLUMN email DROP NOT NULL;
