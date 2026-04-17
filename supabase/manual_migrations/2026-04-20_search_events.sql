-- Search telemetry foundation: append-only events for future analytics (no API/UI in this phase).
--
-- Lang contract (no CHECK whitelist — callers must follow):
--   lang_ui: route / UI locale from the URL (e.g. de, ru, ua).
--   lang_filter: specialist or search data language code (e.g. uk for Ukrainian in DB), not route locale.
--   Example: Ukrainian UI path may use `ua` while filters and stored codes use `uk`.

BEGIN;

CREATE TABLE IF NOT EXISTS public.search_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id text NULL,
  event_type text NOT NULL,
  lang_ui text NULL,
  lang_filter text NULL,
  query_raw text NULL,
  selected_category_id uuid NULL REFERENCES public.categories (id) ON DELETE SET NULL,
  selected_via text NULL,
  place_query text NULL,
  results_count integer NULL,
  had_zero_results boolean NOT NULL DEFAULT false,
  clicked_specialist_id uuid NULL REFERENCES public.specialists (id) ON DELETE SET NULL,
  route_target text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT search_events_results_count_non_negative CHECK (results_count IS NULL OR results_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_search_events_created_at
  ON public.search_events (created_at);

CREATE INDEX IF NOT EXISTS idx_search_events_event_type
  ON public.search_events (event_type);

CREATE INDEX IF NOT EXISTS idx_search_events_selected_category_id
  ON public.search_events (selected_category_id);

CREATE INDEX IF NOT EXISTS idx_search_events_had_zero_results
  ON public.search_events (had_zero_results);

COMMENT ON TABLE public.search_events IS
  'Append-only search/session events for telemetry; no RLS in this migration.';

COMMENT ON COLUMN public.search_events.lang_ui IS
  'Route/UI locale (e.g. de, ru, ua).';

COMMENT ON COLUMN public.search_events.lang_filter IS
  'Data/search language code (e.g. uk for Ukrainian), not route locale.';

COMMIT;
