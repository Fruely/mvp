-- Freuly external Agent API authentication foundation.
-- Manual migration (project convention: supabase/manual_migrations/).
-- Apply on staging/preview first, then production before enabling any authenticated agent routes.
--
-- Security model:
-- - raw API credentials are NEVER stored
-- - credential lookup uses a non-secret random prefix; full credential verification uses
--   an application-side HMAC-SHA256 hash with AGENT_API_KEY_PEPPER
-- - direct anon/authenticated Data API access is denied
-- - application routes use service_role only after explicit agent credential checks
-- - audit rows intentionally exclude raw credentials and request payloads
-- - runtime lifecycle is disable/revoke, never physical DELETE of principals
-- - audit FKs are RESTRICT so historical attribution cannot be dropped by deleting a principal
--
-- Privilege model:
-- Supabase service_role typically has BYPASSRLS, so RLS is not the server-side
-- access-control boundary. Table GRANTs still apply to service_role. This
-- migration therefore:
-- 1. enables RLS and revokes browser roles (defense in depth / Data API);
-- 2. grants service_role only SELECT/INSERT/UPDATE on principals (no DELETE);
-- 3. keeps the audit ledger append-only (SELECT/INSERT);
-- 4. relies on application invariants: disable agent_clients, revoke credentials.
-- Table-owner / superuser can still delete; application code must not.

BEGIN;

-- ---------------------------------------------------------------------------
-- agent_clients
-- One logical external/internal agent principal with explicit scopes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client_type text NOT NULL,
  provider text NULL,
  status text NOT NULL DEFAULT 'active',
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  specialist_id uuid NULL REFERENCES public.specialists (id) ON DELETE SET NULL,
  owner_user_id uuid NULL REFERENCES auth.users (id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_clients_name_nonempty CHECK (length(btrim(name)) > 0),
  CONSTRAINT agent_clients_type_check CHECK (
    client_type IN (
      'consumer_agent',
      'provider_agent',
      'business_agent',
      'internal_agent'
    )
  ),
  CONSTRAINT agent_clients_status_check CHECK (
    status IN ('active', 'disabled')
  ),
  CONSTRAINT agent_clients_scopes_allowlist_check CHECK (
    scopes <@ ARRAY[
      'requests:create',
      'requests:read',
      'requests:cancel',
      'leads:discover',
      'leads:read',
      'leads:respond',
      'matches:read',
      'matches:respond'
    ]::text[]
  )
);

CREATE INDEX IF NOT EXISTS idx_agent_clients_status_type
  ON public.agent_clients (status, client_type);

CREATE INDEX IF NOT EXISTS idx_agent_clients_specialist
  ON public.agent_clients (specialist_id)
  WHERE specialist_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_clients_owner_user
  ON public.agent_clients (owner_user_id)
  WHERE owner_user_id IS NOT NULL;

COMMENT ON TABLE public.agent_clients IS
  'Agent API principals. Scopes are server-authoritative. No raw credentials are stored on this table.';
COMMENT ON COLUMN public.agent_clients.scopes IS
  'Server-authoritative Capability Core scopes. Vocabulary is constrained by agent_clients_scopes_allowlist_check and must stay in sync with FREULY_CAPABILITY_CORE.required_scopes.';
COMMENT ON COLUMN public.agent_clients.status IS
  'Runtime lifecycle is active or disabled. Application code must not DELETE this row.';
COMMENT ON COLUMN public.agent_clients.specialist_id IS
  'Optional provider binding for provider_agent principals. Authorization must still verify scopes and ownership in application logic.';
COMMENT ON COLUMN public.agent_clients.owner_user_id IS
  'Optional Supabase Auth user binding for agents acting on behalf of an authenticated Freuly user.';

-- ---------------------------------------------------------------------------
-- agent_credentials
-- Rotatable credentials. Raw token is shown/transported only at issuance.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_client_id uuid NOT NULL REFERENCES public.agent_clients (id) ON DELETE RESTRICT,
  key_prefix text NOT NULL,
  credential_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  expires_at timestamptz NULL,
  revoked_at timestamptz NULL,
  last_used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_credentials_key_prefix_unique UNIQUE (key_prefix),
  CONSTRAINT agent_credentials_hash_unique UNIQUE (credential_hash),
  CONSTRAINT agent_credentials_prefix_format_check CHECK (
    key_prefix ~ '^[a-f0-9]{12}$'
  ),
  CONSTRAINT agent_credentials_hash_format_check CHECK (
    credential_hash ~ '^[a-f0-9]{64}$'
  ),
  CONSTRAINT agent_credentials_status_check CHECK (
    status IN ('active', 'revoked')
  ),
  CONSTRAINT agent_credentials_revoked_consistency_check CHECK (
    (status = 'active' AND revoked_at IS NULL)
    OR (status = 'revoked' AND revoked_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_agent_credentials_client_status
  ON public.agent_credentials (agent_client_id, status);

CREATE INDEX IF NOT EXISTS idx_agent_credentials_active_expiry
  ON public.agent_credentials (expires_at)
  WHERE status = 'active' AND expires_at IS NOT NULL;

COMMENT ON TABLE public.agent_credentials IS
  'Rotatable Agent API credentials. Stores only HMAC-SHA256 credential hashes plus a non-secret lookup prefix; raw credentials are never persisted. Runtime lifecycle is revoke, not DELETE.';
COMMENT ON COLUMN public.agent_credentials.key_prefix IS
  'Non-secret 12-hex lookup prefix embedded in the frly_agent_* credential.';
COMMENT ON COLUMN public.agent_credentials.credential_hash IS
  'HMAC-SHA256 of the complete raw credential using server-only AGENT_API_KEY_PEPPER.';

-- ---------------------------------------------------------------------------
-- agent_api_audit_events
-- Append-only operational/security ledger for authenticated agent requests.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_api_audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  agent_client_id uuid NULL REFERENCES public.agent_clients (id) ON DELETE RESTRICT,
  credential_id uuid NULL REFERENCES public.agent_credentials (id) ON DELETE RESTRICT,
  request_id text NULL,
  capability text NULL,
  route text NOT NULL,
  method text NOT NULL,
  outcome text NOT NULL,
  http_status integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_api_audit_route_nonempty CHECK (length(btrim(route)) > 0),
  CONSTRAINT agent_api_audit_method_nonempty CHECK (length(btrim(method)) > 0),
  CONSTRAINT agent_api_audit_outcome_check CHECK (
    outcome IN (
      'allowed',
      'unauthorized',
      'forbidden',
      'validation_error',
      'rate_limited',
      'success',
      'error'
    )
  ),
  CONSTRAINT agent_api_audit_http_status_check CHECK (
    http_status BETWEEN 100 AND 599
  )
);

CREATE INDEX IF NOT EXISTS idx_agent_api_audit_created
  ON public.agent_api_audit_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_api_audit_client_created
  ON public.agent_api_audit_events (agent_client_id, created_at DESC)
  WHERE agent_client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_api_audit_capability_created
  ON public.agent_api_audit_events (capability, created_at DESC)
  WHERE capability IS NOT NULL;

COMMENT ON TABLE public.agent_api_audit_events IS
  'Append-only Agent API audit ledger. Do not store raw credentials, contact payloads, request bodies or plaintext IP addresses in metadata. Principal FKs are RESTRICT so attribution survives disable/revoke and cannot be erased by deleting the principal.';

-- ---------------------------------------------------------------------------
-- RLS / grants: service-role APIs only.
-- No browser/client policy is created intentionally.
-- ---------------------------------------------------------------------------
ALTER TABLE public.agent_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_api_audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.agent_clients FROM anon, authenticated;
REVOKE ALL ON TABLE public.agent_credentials FROM anon, authenticated;
REVOKE ALL ON TABLE public.agent_api_audit_events FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.agent_api_audit_events_id_seq FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.agent_clients TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.agent_credentials TO service_role;
REVOKE DELETE ON TABLE public.agent_clients FROM service_role;
REVOKE DELETE ON TABLE public.agent_credentials FROM service_role;
GRANT SELECT, INSERT ON TABLE public.agent_api_audit_events TO service_role;
REVOKE UPDATE, DELETE ON TABLE public.agent_api_audit_events FROM service_role;
GRANT USAGE, SELECT ON SEQUENCE public.agent_api_audit_events_id_seq TO service_role;

COMMIT;
