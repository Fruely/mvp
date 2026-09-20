-- Freuly user-to-agent delegation / consent foundation.
-- Stacked on 2026-09-20_agent_auth_foundation.sql.
-- No agent write route should be enabled until this migration and the auth
-- foundation are applied and verified.
--
-- Security model:
-- - delegation is explicit, capability-specific and revocable
-- - a delegation is bound to exactly one agent_client and one Freuly user
-- - browser roles receive no direct Data API access
-- - service-side code must verify BOTH agent scopes and this delegation

BEGIN;

CREATE TABLE IF NOT EXISTS public.agent_delegations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_client_id uuid NOT NULL REFERENCES public.agent_clients (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  allowed_capabilities text[] NOT NULL,
  consent_version text NOT NULL,
  purpose text NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NULL,
  revoked_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT agent_delegations_status_check CHECK (
    status IN ('active', 'revoked')
  ),
  CONSTRAINT agent_delegations_capabilities_nonempty_check CHECK (
    cardinality(allowed_capabilities) > 0
  ),
  CONSTRAINT agent_delegations_capabilities_allowlist_check CHECK (
    allowed_capabilities <@ ARRAY[
      'create_service_request',
      'get_service_request',
      'cancel_service_request',
      'get_match',
      'accept_match',
      'decline_match'
    ]::text[]
  ),
  CONSTRAINT agent_delegations_consent_version_nonempty_check CHECK (
    length(btrim(consent_version)) BETWEEN 1 AND 64
  ),
  CONSTRAINT agent_delegations_revoked_consistency_check CHECK (
    (status = 'active' AND revoked_at IS NULL)
    OR (status = 'revoked' AND revoked_at IS NOT NULL)
  ),
  CONSTRAINT agent_delegations_expiry_after_grant_check CHECK (
    expires_at IS NULL OR expires_at > granted_at
  )
);

CREATE INDEX IF NOT EXISTS idx_agent_delegations_client_status
  ON public.agent_delegations (agent_client_id, status);

CREATE INDEX IF NOT EXISTS idx_agent_delegations_user_status
  ON public.agent_delegations (user_id, status);

CREATE INDEX IF NOT EXISTS idx_agent_delegations_active_expiry
  ON public.agent_delegations (expires_at)
  WHERE status = 'active' AND expires_at IS NOT NULL;

COMMENT ON TABLE public.agent_delegations IS
  'Explicit user authorization for an external Agent API principal. Application authorization must also verify the agent credential and required server-authoritative scope.';
COMMENT ON COLUMN public.agent_delegations.allowed_capabilities IS
  'Exact user-delegatable Capability Core operations authorized by this consent record.';
COMMENT ON COLUMN public.agent_delegations.consent_version IS
  'Version of the user-facing delegation consent text accepted when the authorization was granted.';
COMMENT ON COLUMN public.agent_delegations.purpose IS
  'Optional human-readable purpose captured with consent. Do not store request payloads or sensitive client data here.';

ALTER TABLE public.agent_delegations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.agent_delegations FROM anon, authenticated;
GRANT ALL ON TABLE public.agent_delegations TO service_role;

COMMIT;
