-- Freuly Growth System: dedupe market search queries
-- Purpose: prevent duplicate seed/search queries.

delete from public.market_search_queries a
using public.market_search_queries b
where a.query = b.query
  and a.id > b.id;

create unique index if not exists idx_market_search_queries_query_unique
  on public.market_search_queries(query);
