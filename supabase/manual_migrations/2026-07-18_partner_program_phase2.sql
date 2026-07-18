-- Freuly Partner Program Phase 2
-- Applications, invitations, in-app notifications.
-- Manual migration (project convention: supabase/manual_migrations/).
-- Apply on staging first. Does not touch specialist_plan or billing tables.
-- Phase 2 APIs use service role after session/admin checks (same as Phase 1).

BEGIN;

-- ---------------------------------------------------------------------------
-- partner_applications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  channel_name text NOT NULL,
  channel_url text NOT NULL,
  extra_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  platform text NULL,
  topic text NULL,
  audience_lang text NULL,
  audience_geo text NULL,
  subscribers_approx text NULL,
  reach_approx text NULL,
  comment text NULL,
  privacy_accepted_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reject_reason text NULL,
  partner_id uuid NULL REFERENCES public.partners (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_applications_status_check CHECK (
    status IN ('pending', 'approved', 'rejected')
  )
);

CREATE INDEX IF NOT EXISTS idx_partner_applications_status_created
  ON public.partner_applications (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_applications_email
  ON public.partner_applications (lower(email));

CREATE INDEX IF NOT EXISTS idx_partner_applications_partner_id
  ON public.partner_applications (partner_id)
  WHERE partner_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- partner_invitations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners (id) ON DELETE RESTRICT,
  email text NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_label text NOT NULL DEFAULT 'admin_token',
  CONSTRAINT partner_invitations_token_hash_unique UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_partner_invitations_partner_id
  ON public.partner_invitations (partner_id);

CREATE INDEX IF NOT EXISTS idx_partner_invitations_email
  ON public.partner_invitations (lower(email));

CREATE INDEX IF NOT EXISTS idx_partner_invitations_expires
  ON public.partner_invitations (expires_at)
  WHERE used_at IS NULL;

COMMENT ON TABLE public.partner_invitations IS
  'One-time hashed invite tokens binding partners.user_id to auth.users. Raw token never stored.';

-- ---------------------------------------------------------------------------
-- partner_notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners (id) ON DELETE CASCADE,
  user_id uuid NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  commission_id uuid NULL REFERENCES public.partner_commissions (id) ON DELETE SET NULL,
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_notifications_commission_id_unique UNIQUE (commission_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_notifications_partner_created
  ON public.partner_notifications (partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_notifications_user_unread
  ON public.partner_notifications (user_id, created_at DESC)
  WHERE user_id IS NOT NULL AND read_at IS NULL;

COMMENT ON TABLE public.partner_notifications IS
  'In-app partner notifications. commission_id unique for accrual idempotency. No web push.';

-- ---------------------------------------------------------------------------
-- RLS: deny direct client access; service-role APIs only (Phase 1 pattern)
-- Optional future: SELECT own rows WHERE partners.user_id = auth.uid()
-- ---------------------------------------------------------------------------
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_notifications ENABLE ROW LEVEL SECURITY;

-- COMMENT ON POLICY would require named policies; document intent:
COMMENT ON TABLE public.partner_applications IS
  'Public partner program applications before partner approval. No referral code until approved. RLS deny-all for anon/authenticated; service_role via API. Future: SELECT own partner rows via auth.uid().';

REVOKE ALL ON TABLE public.partner_applications FROM anon, authenticated;
REVOKE ALL ON TABLE public.partner_invitations FROM anon, authenticated;
REVOKE ALL ON TABLE public.partner_notifications FROM anon, authenticated;

GRANT ALL ON TABLE public.partner_applications TO service_role;
GRANT ALL ON TABLE public.partner_invitations TO service_role;
GRANT ALL ON TABLE public.partner_notifications TO service_role;

COMMIT;
