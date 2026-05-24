-- Recommended specialists performance indexes.
-- Supports homepage founder / premium / discovery recommendation pools.
-- Run manually in Supabase SQL Editor.
-- Note: CREATE INDEX CONCURRENTLY must not run inside a transaction block.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_specialists_reco_founder
ON public.specialists (founder_assigned_at, id)
WHERE founder_badge = true
  AND is_active = true
  AND is_visible = true
  AND COALESCE(is_test, false) = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_specialists_reco_premium
ON public.specialists (featured_priority DESC, featured_at DESC, published_at DESC, id)
WHERE is_active = true
  AND is_visible = true
  AND COALESCE(is_test, false) = false
  AND (is_featured = true OR status = 'featured_verified');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_specialists_reco_discovery
ON public.specialists (published_at DESC, created_at DESC, id)
WHERE is_active = true
  AND is_visible = true
  AND COALESCE(is_test, false) = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_specialist_services_reco_valid
ON public.specialist_services (specialist_id)
WHERE is_active = true
  AND price_from > 0
  AND NULLIF(BTRIM(title), '') IS NOT NULL;
