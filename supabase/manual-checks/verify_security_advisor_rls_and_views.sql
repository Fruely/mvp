-- Post-migration verification (SELECT-only)
-- Target migration:
-- supabase/migrations/20260707_fix_security_advisor_rls_and_views.sql

-- 1) RLS enabled on target tables
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'specialist_services',
    'specialist_service_translations',
    'specialist_profile_translations',
    'specialist_reviews',
    'search_events',
    'profile_view_events',
    'languages',
    'cities',
    'postal_codes',
    'category_seo_templates',
    'homepage_popular_categories'
  )
order by c.relname;

-- 2) Expected policies exist
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
from pg_policies
where schemaname = 'public'
  and policyname in (
    'p_languages_public_read',
    'p_cities_public_read',
    'p_postal_codes_public_read',
    'p_specialist_services_public_read',
    'p_specialist_service_translations_public_read',
    'p_specialist_profile_translations_public_read',
    'p_specialist_reviews_public_read'
  )
order by tablename, policyname;

-- 3) search/profile event grants must be absent for anon/authenticated
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('search_events', 'profile_view_events')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 4) growth views grants must be absent for anon/authenticated
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'growth_category_opportunities_view',
    'growth_content_tasks_view',
    'growth_scout_prospects_view',
    'growth_market_signals_view',
    'growth_crm_sync_log_view',
    'growth_content_tasks_operator_view',
    'growth_scout_prospects_operator_view',
    'growth_operator_daily_actions_view',
    'growth_category_opportunities_operator_view'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 5) security_invoker=true expected on target views
select
  n.nspname as schema_name,
  c.relname as view_name,
  coalesce(
    exists (
      select 1
      from unnest(coalesce(c.reloptions, '{}'::text[])) as opt
      where opt = 'security_invoker=true'
    ),
    false
  ) as security_invoker_true
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'v'
  and c.relname in (
    'category_specialist_counts',
    'homepage_popular_categories_view',
    'search_specialists',
    'specialist_rating_stats',
    'v_searchable_categories',
    'growth_category_opportunities_view',
    'growth_content_tasks_view',
    'growth_scout_prospects_view',
    'growth_market_signals_view',
    'growth_crm_sync_log_view',
    'growth_content_tasks_operator_view',
    'growth_scout_prospects_operator_view',
    'growth_operator_daily_actions_view',
    'growth_category_opportunities_operator_view'
  )
order by c.relname;

-- 6) Public specialist policies must not include paused
select
  tablename,
  policyname,
  qual
from pg_policies
where schemaname = 'public'
  and policyname in (
    'p_specialist_services_public_read',
    'p_specialist_service_translations_public_read',
    'p_specialist_profile_translations_public_read',
    'p_specialist_reviews_public_read'
  )
  and qual ilike '%paused%';
