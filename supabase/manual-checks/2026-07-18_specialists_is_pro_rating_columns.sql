-- =============================================================================
-- READ ONLY. SELECT only.
-- Confirms specialists.is_pro / specialists.rating exist (production RPC depends
-- on them). Does not modify schema or data. Do not confuse with is_featured /
-- specialist_rating_stats (app UI paths — separate from this RPC).
-- =============================================================================

SELECT
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'specialists'
  AND c.column_name IN ('is_pro', 'rating', 'is_featured')
ORDER BY c.column_name;

SELECT
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.table_name = 'specialist_rating_stats'
  AND c.column_name IN ('specialist_id', 'rating_avg', 'reviews_count')
ORDER BY c.column_name;
