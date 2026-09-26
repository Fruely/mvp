-- Persisted deterministic matches for confirmed service requests.
-- Apply manually. Do not auto-run from CI.
--
-- service_languages is an explicit client requirement.
-- An empty array means no language restriction.
-- It is not interface locale and not the language the text was written in.
-- preferred_language and locale stay as they are.

BEGIN;

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS service_languages text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.service_requests.service_languages IS
  'Explicit service languages the client requires, as BCP-47 primary subtags. Empty means no language restriction.';

CREATE TABLE IF NOT EXISTS public.service_request_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_request_id uuid NOT NULL REFERENCES public.service_requests (id) ON DELETE CASCADE,
  specialist_id uuid NOT NULL REFERENCES public.specialists (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  matched_at timestamptz NOT NULL DEFAULT now(),
  match_reasons text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_request_matches_unique_pair UNIQUE (service_request_id, specialist_id),
  CONSTRAINT service_request_matches_status_check CHECK (status IN ('active'))
);

CREATE INDEX IF NOT EXISTS idx_service_request_matches_specialist_matched
  ON public.service_request_matches (specialist_id, matched_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_request_matches_request
  ON public.service_request_matches (service_request_id);

COMMENT ON TABLE public.service_request_matches IS
  'Private specialist queue. No client name, email, phone or raw request text.';

ALTER TABLE public.service_request_matches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.service_request_matches FROM anon, authenticated;
GRANT SELECT ON public.service_request_matches TO authenticated;
GRANT ALL ON public.service_request_matches TO service_role;

DROP POLICY IF EXISTS service_request_matches_select_own ON public.service_request_matches;
CREATE POLICY service_request_matches_select_own
  ON public.service_request_matches
  FOR SELECT
  TO authenticated
  USING (
    specialist_id IN (
      SELECT id FROM public.specialists WHERE user_id = auth.uid()
    )
  );

COMMIT;
