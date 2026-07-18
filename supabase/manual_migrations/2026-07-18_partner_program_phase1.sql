-- Freuly Partner Program Phase 1 foundation.
-- Manual migration (project convention: supabase/manual_migrations/).
-- Apply on staging first. Does not touch specialist_plan or billing tables.
--
-- Financial rule: commissions are NEVER created from specialist_plan / free grants.
-- Interim source_type: admin_confirmed_first_payment
-- Future source_type: stripe_invoice_payment_succeeded

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- partners
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL UNIQUE,
  name text NOT NULL,
  email text NOT NULL,
  channel_name text NULL,
  channel_url text NULL,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  commission_amount_cents integer NOT NULL DEFAULT 2900,
  currency text NOT NULL DEFAULT 'EUR',
  contract_signed_at timestamptz NULL,
  approved_at timestamptz NULL,
  approved_by uuid NULL,
  disabled_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partners_status_check CHECK (
    status IN ('pending', 'active', 'paused', 'rejected', 'disabled')
  ),
  CONSTRAINT partners_commission_positive CHECK (commission_amount_cents > 0),
  CONSTRAINT partners_currency_check CHECK (char_length(currency) = 3),
  CONSTRAINT partners_referral_code_format CHECK (
    referral_code ~ '^[a-z0-9]([a-z0-9-]{1,62}[a-z0-9])?$'
  )
);

-- Email is intentionally NOT unique: one person may operate multiple partner
-- entities (different channels). Uniqueness is enforced on referral codes.
CREATE UNIQUE INDEX IF NOT EXISTS uq_partners_referral_code
  ON public.partners (referral_code);

CREATE INDEX IF NOT EXISTS idx_partners_status ON public.partners (status);
CREATE INDEX IF NOT EXISTS idx_partners_email ON public.partners (lower(email));

COMMENT ON TABLE public.partners IS
  'Partner Program profiles. Email not unique; codes are unique.';
COMMENT ON COLUMN public.partners.commission_amount_cents IS
  'Per-partner rate in integer cents; snapshotted onto commissions at earn time.';

-- ---------------------------------------------------------------------------
-- partner_links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners (id) ON DELETE CASCADE,
  code text NOT NULL,
  campaign text NULL,
  target_path text NOT NULL DEFAULT '/become-specialist',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_links_code_format CHECK (
    code ~ '^[a-z0-9]([a-z0-9-]{1,62}[a-z0-9])?$'
  ),
  CONSTRAINT partner_links_target_path_internal CHECK (
    target_path LIKE '/%'
    AND target_path NOT LIKE '//%'
    AND target_path !~* '^(https?:|javascript:|data:)'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_links_code
  ON public.partner_links (code);

CREATE INDEX IF NOT EXISTS idx_partner_links_partner_id
  ON public.partner_links (partner_id);

COMMENT ON TABLE public.partner_links IS
  'Campaign/referral links. Codes are globally unique across partners.';
COMMENT ON COLUMN public.partner_links.target_path IS
  'Internal path only (leading /). Absolute URLs forbidden at DB + app layer.';

-- ---------------------------------------------------------------------------
-- partner_clicks (non-financial telemetry)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners (id) ON DELETE CASCADE,
  partner_link_id uuid NULL REFERENCES public.partner_links (id) ON DELETE SET NULL,
  visitor_id_hash text NULL,
  session_id text NULL,
  landing_path text NULL,
  referrer_host text NULL,
  utm_source text NULL,
  utm_medium text NULL,
  utm_campaign text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_clicks_partner_created
  ON public.partner_clicks (partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_clicks_link_created
  ON public.partner_clicks (partner_link_id, created_at DESC);

COMMENT ON TABLE public.partner_clicks IS
  'Referral click events. Not financial proof. No raw IP stored.';

-- ---------------------------------------------------------------------------
-- partner_attributions (immutable first-touch hard-bind)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_attributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners (id) ON DELETE RESTRICT,
  partner_link_id uuid NULL REFERENCES public.partner_links (id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  specialist_id uuid NULL REFERENCES public.specialists (id) ON DELETE RESTRICT,
  attribution_method text NOT NULL,
  first_click_at timestamptz NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_attributions_method_check CHECK (
    attribution_method IN ('cookie', 'referral_code', 'admin')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_attributions_user_id
  ON public.partner_attributions (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_attributions_specialist_id
  ON public.partner_attributions (specialist_id)
  WHERE specialist_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_attributions_partner_id
  ON public.partner_attributions (partner_id);

COMMENT ON TABLE public.partner_attributions IS
  'Permanent first-touch bind. Do not UPDATE partner_id in normal flows.';

-- ---------------------------------------------------------------------------
-- partner_payouts (foundation only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners (id) ON DELETE RESTRICT,
  period_start date NULL,
  period_end date NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'draft',
  payment_reference text NULL,
  paid_at timestamptz NULL,
  paid_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_payouts_amount_non_negative CHECK (amount_cents >= 0),
  CONSTRAINT partner_payouts_status_check CHECK (
    status IN ('draft', 'ready', 'paid', 'cancelled')
  ),
  CONSTRAINT partner_payouts_currency_check CHECK (char_length(currency) = 3)
);

CREATE INDEX IF NOT EXISTS idx_partner_payouts_partner_id
  ON public.partner_payouts (partner_id);

-- ---------------------------------------------------------------------------
-- partner_commissions (financial ledger)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners (id) ON DELETE RESTRICT,
  attribution_id uuid NOT NULL REFERENCES public.partner_attributions (id) ON DELETE RESTRICT,
  specialist_id uuid NOT NULL REFERENCES public.specialists (id) ON DELETE RESTRICT,
  source_type text NOT NULL,
  source_event_id text NOT NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz NULL,
  approved_by uuid NULL,
  rejected_at timestamptz NULL,
  rejected_by uuid NULL,
  rejection_reason text NULL,
  reversed_at timestamptz NULL,
  reversal_reason text NULL,
  payout_id uuid NULL REFERENCES public.partner_payouts (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_commissions_source_type_check CHECK (
    source_type IN ('admin_confirmed_first_payment', 'stripe_invoice_payment_succeeded')
  ),
  CONSTRAINT partner_commissions_status_check CHECK (
    status IN ('pending', 'approved', 'rejected', 'paid', 'reversed')
  ),
  CONSTRAINT partner_commissions_amount_positive CHECK (amount_cents > 0),
  CONSTRAINT partner_commissions_currency_check CHECK (char_length(currency) = 3),
  CONSTRAINT partner_commissions_source_event_nonempty CHECK (
    char_length(trim(source_event_id)) > 0
  )
);

-- Idempotency for webhook / admin-confirm event ids
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_commissions_source_event
  ON public.partner_commissions (source_type, source_event_id);

-- At most one earning commission per specialist (history kept via status updates)
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_commissions_specialist_id
  ON public.partner_commissions (specialist_id);

CREATE INDEX IF NOT EXISTS idx_partner_commissions_partner_status
  ON public.partner_commissions (partner_id, status);

CREATE INDEX IF NOT EXISTS idx_partner_commissions_earned_at
  ON public.partner_commissions (earned_at DESC);

COMMENT ON TABLE public.partner_commissions IS
  'Partner commission ledger. Amount snapshotted at creation. Never driven by specialist_plan.';

-- ---------------------------------------------------------------------------
-- partner_audit_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_label text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NULL,
  partner_id uuid NULL REFERENCES public.partners (id) ON DELETE SET NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_audit_log_partner_created
  ON public.partner_audit_log (partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_audit_log_action_created
  ON public.partner_audit_log (action, created_at DESC);

COMMENT ON TABLE public.partner_audit_log IS
  'Admin-sensitive partner actions. No secrets or bank details.';

-- ---------------------------------------------------------------------------
-- RLS: deny direct client access; service-role APIs only for Phase 1
-- ---------------------------------------------------------------------------
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_audit_log ENABLE ROW LEVEL SECURITY;

-- No policies for anon/authenticated → default deny for those roles.
-- Future Phase 2: add SELECT policies for partners.user_id = auth.uid().

REVOKE ALL ON TABLE public.partners FROM anon, authenticated;
REVOKE ALL ON TABLE public.partner_links FROM anon, authenticated;
REVOKE ALL ON TABLE public.partner_clicks FROM anon, authenticated;
REVOKE ALL ON TABLE public.partner_attributions FROM anon, authenticated;
REVOKE ALL ON TABLE public.partner_commissions FROM anon, authenticated;
REVOKE ALL ON TABLE public.partner_payouts FROM anon, authenticated;
REVOKE ALL ON TABLE public.partner_audit_log FROM anon, authenticated;

GRANT ALL ON TABLE public.partners TO service_role;
GRANT ALL ON TABLE public.partner_links TO service_role;
GRANT ALL ON TABLE public.partner_clicks TO service_role;
GRANT ALL ON TABLE public.partner_attributions TO service_role;
GRANT ALL ON TABLE public.partner_commissions TO service_role;
GRANT ALL ON TABLE public.partner_payouts TO service_role;
GRANT ALL ON TABLE public.partner_audit_log TO service_role;

COMMIT;
