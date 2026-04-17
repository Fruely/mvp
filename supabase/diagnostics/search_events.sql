-- Diagnostics: read-only queries for manual analysis of public.search_events.
-- Run in SQL editor or psql; not applied as migration.

-- -----------------------------------------------------------------------------
-- 1) Recent search_submitted events (last 50)
--    Sanity check: hero submits are arriving with expected fields.
-- -----------------------------------------------------------------------------
SELECT
  id,
  created_at,
  session_id,
  lang_ui,
  lang_filter,
  query_raw,
  place_query,
  route_target,
  metadata
FROM public.search_events
WHERE event_type = 'search_submitted'
ORDER BY created_at DESC
LIMIT 50;

-- -----------------------------------------------------------------------------
-- 2) Recent suggestion_selected events (last 50)
--    Category picks from suggest dropdown before submit.
-- -----------------------------------------------------------------------------
SELECT
  id,
  created_at,
  session_id,
  lang_ui,
  lang_filter,
  query_raw,
  selected_category_id,
  metadata
FROM public.search_events
WHERE event_type = 'suggestion_selected'
ORDER BY created_at DESC
LIMIT 50;

-- -----------------------------------------------------------------------------
-- 3) Recent zero_results_viewed events (last 50)
--    Empty result screens on /specialists or category pages.
-- -----------------------------------------------------------------------------
SELECT
  id,
  created_at,
  session_id,
  lang_ui,
  lang_filter,
  query_raw,
  place_query,
  route_target,
  results_count,
  had_zero_results,
  metadata
FROM public.search_events
WHERE event_type = 'zero_results_viewed'
ORDER BY created_at DESC
LIMIT 50;

-- -----------------------------------------------------------------------------
-- 4) Top query_raw for search_submitted (non-empty)
--    What users typed in the hero before submit.
-- -----------------------------------------------------------------------------
SELECT
  trim(query_raw) AS query_raw,
  count(*) AS event_count
FROM public.search_events
WHERE event_type = 'search_submitted'
  AND query_raw IS NOT NULL
  AND trim(query_raw) <> ''
GROUP BY trim(query_raw)
ORDER BY event_count DESC, query_raw ASC
LIMIT 30;

-- -----------------------------------------------------------------------------
-- 5) Top query_raw for suggestion_selected (non-empty)
--    Rough “what users typed before picking” (conversion proxy without session join).
-- -----------------------------------------------------------------------------
SELECT
  trim(query_raw) AS query_raw,
  count(*) AS event_count
FROM public.search_events
WHERE event_type = 'suggestion_selected'
  AND query_raw IS NOT NULL
  AND trim(query_raw) <> ''
GROUP BY trim(query_raw)
ORDER BY event_count DESC, query_raw ASC
LIMIT 30;

-- -----------------------------------------------------------------------------
-- 6) zero_results_viewed — most frequent route_target
--    Which result URLs see empty lists most often.
-- -----------------------------------------------------------------------------
SELECT
  coalesce(route_target, '') AS route_target,
  count(*) AS event_count
FROM public.search_events
WHERE event_type = 'zero_results_viewed'
GROUP BY coalesce(route_target, '')
ORDER BY event_count DESC
LIMIT 30;

-- -----------------------------------------------------------------------------
-- 7) zero_results_viewed — most frequent place_query
--    Geographic / PLZ strings tied to empty /specialists results.
-- -----------------------------------------------------------------------------
SELECT
  coalesce(place_query, '') AS place_query,
  count(*) AS event_count
FROM public.search_events
WHERE event_type = 'zero_results_viewed'
GROUP BY coalesce(place_query, '')
ORDER BY event_count DESC
LIMIT 30;

-- -----------------------------------------------------------------------------
-- 8) zero_results_viewed — most frequent lang_filter
--    Which data/search language codes hit empty results.
-- -----------------------------------------------------------------------------
SELECT
  coalesce(lang_filter, '') AS lang_filter,
  count(*) AS event_count
FROM public.search_events
WHERE event_type = 'zero_results_viewed'
GROUP BY coalesce(lang_filter, '')
ORDER BY event_count DESC
LIMIT 20;

-- -----------------------------------------------------------------------------
-- 9) zero_results_viewed — metadata fallback (e.g. no_local_results from API)
--    Requires metadata JSON key "fallback" where present.
-- -----------------------------------------------------------------------------
SELECT
  coalesce(metadata->>'fallback', '') AS fallback,
  count(*) AS event_count
FROM public.search_events
WHERE event_type = 'zero_results_viewed'
GROUP BY coalesce(metadata->>'fallback', '')
ORDER BY event_count DESC
LIMIT 20;

-- -----------------------------------------------------------------------------
-- 10) Rough conversion: session_id values with BOTH search_submitted and
--     suggestion_selected (empty until client sends session_id)
-- -----------------------------------------------------------------------------
SELECT
  session_id,
  max(created_at) AS last_event_at
FROM public.search_events
WHERE session_id IS NOT NULL
  AND event_type IN ('search_submitted', 'suggestion_selected')
GROUP BY session_id
HAVING count(*) FILTER (WHERE event_type = 'search_submitted') >= 1
   AND count(*) FILTER (WHERE event_type = 'suggestion_selected') >= 1
ORDER BY last_event_at DESC
LIMIT 50;

-- -----------------------------------------------------------------------------
-- 11) Top selected categories (suggestion_selected) with slug from categories
--     Which category IDs are picked from suggest most often.
-- -----------------------------------------------------------------------------
SELECT
  c.slug,
  se.selected_category_id,
  count(*) AS pick_count
FROM public.search_events se
LEFT JOIN public.categories c ON c.id = se.selected_category_id
WHERE se.event_type = 'suggestion_selected'
  AND se.selected_category_id IS NOT NULL
GROUP BY se.selected_category_id, c.slug
ORDER BY pick_count DESC
LIMIT 30;
