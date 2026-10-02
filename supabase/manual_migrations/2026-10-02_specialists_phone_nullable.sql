-- Migration Phase 1 — Step 1
-- ADR-001 / Progressive Identity compatibility.
-- A specialist draft is owned by auth user_id and must not require contact fields.
-- No placeholder phone values are introduced.

ALTER TABLE public.specialists
  ALTER COLUMN phone DROP NOT NULL;
