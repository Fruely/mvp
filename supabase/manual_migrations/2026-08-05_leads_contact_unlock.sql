-- Phase 1: specialist contact unlock for direct leads (non-destructive).
-- Apply manually in Supabase SQL editor. Do not auto-run from CI/Cursor.

BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS contact_unlocked_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS contact_unlocked_by uuid NULL;

COMMENT ON COLUMN public.leads.contact_unlocked_at IS
  'When the assigned specialist unlocked client contacts in the dashboard.';
COMMENT ON COLUMN public.leads.contact_unlocked_by IS
  'auth.users id of the specialist account that unlocked contacts (nullable until unlock).';

COMMIT;
