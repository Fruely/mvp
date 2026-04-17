-- Public specialist profile view events (append-only). MVP dedupe window enforced in app (24h).
-- No RLS in this phase.

BEGIN;

CREATE TABLE IF NOT EXISTS public.profile_view_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  specialist_id uuid NOT NULL REFERENCES public.specialists (id) ON DELETE CASCADE,
  viewer_key text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profile_view_events_specialist_id
  ON public.profile_view_events (specialist_id);

CREATE INDEX IF NOT EXISTS idx_profile_view_events_specialist_created
  ON public.profile_view_events (specialist_id, created_at);

CREATE INDEX IF NOT EXISTS idx_profile_view_events_dedupe
  ON public.profile_view_events (specialist_id, viewer_key, created_at);

COMMENT ON TABLE public.profile_view_events IS
  'Append-only events when a public specialist profile page is viewed; dedupe via viewer_key + app window.';

COMMIT;
