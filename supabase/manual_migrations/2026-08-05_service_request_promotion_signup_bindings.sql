-- Phase 3D-A: immutable signup conversion from promotion attribution to specialist.
-- Apply manually in Supabase SQL editor. Do not auto-run from CI/Cursor.

BEGIN;

CREATE TABLE IF NOT EXISTS public.service_request_promotion_signup_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribution_id uuid NOT NULL
    REFERENCES public.service_request_promotion_attributions (id) ON DELETE CASCADE,
  promotion_id uuid NOT NULL
    REFERENCES public.service_request_promotions (id) ON DELETE CASCADE,
  specialist_id uuid NOT NULL
    REFERENCES public.specialists (id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  registered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_request_promotion_signup_bindings_attribution_id_unique
    UNIQUE (attribution_id),
  CONSTRAINT service_request_promotion_signup_bindings_specialist_id_unique
    UNIQUE (specialist_id),
  CONSTRAINT service_request_promotion_signup_bindings_user_id_unique
    UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_service_request_promotion_signup_bindings_promotion_registered
  ON public.service_request_promotion_signup_bindings (promotion_id, registered_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_request_promotion_signup_bindings_registered_at
  ON public.service_request_promotion_signup_bindings (registered_at DESC);

COMMENT ON TABLE public.service_request_promotion_signup_bindings IS
  'Immutable signup conversion: promotion attribution to registered specialist (Phase 3D-A). Not referral, not payment, not auth session. No client contacts. Runtime INSERT only.';

COMMENT ON COLUMN public.service_request_promotion_signup_bindings.attribution_id IS
  'Source first-party attribution row; at most one signup binding per attribution session.';

COMMENT ON COLUMN public.service_request_promotion_signup_bindings.promotion_id IS
  'Denormalized promotion reference; runtime must copy from attribution.promotion_id server-side — never accept from client.';

COMMENT ON COLUMN public.service_request_promotion_signup_bindings.specialist_id IS
  'Registered marketplace specialist; at most one promoted-request acquisition per specialist.';

COMMENT ON COLUMN public.service_request_promotion_signup_bindings.user_id IS
  'Auth user id at signup (matches specialists.user_id); no FK to auth.users in this schema.';

COMMENT ON COLUMN public.service_request_promotion_signup_bindings.registered_at IS
  'Timestamp when specialist signup was bound to the attribution; immutable after insert.';

ALTER TABLE public.service_request_promotion_signup_bindings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.service_request_promotion_signup_bindings FROM anon, authenticated;
GRANT ALL ON public.service_request_promotion_signup_bindings TO service_role;

COMMIT;
