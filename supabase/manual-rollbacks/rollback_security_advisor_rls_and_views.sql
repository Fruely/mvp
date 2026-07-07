-- Manual rollback template for:
-- supabase/migrations/20260707_fix_security_advisor_rls_and_views.sql
-- WARNING: manual execution only. Do not auto-apply.

begin;

-- Remove policies created by the migration.
do $$
begin
  if to_regclass('public.languages') is not null then
    drop policy if exists p_languages_public_read on public.languages;
  end if;
  if to_regclass('public.cities') is not null then
    drop policy if exists p_cities_public_read on public.cities;
  end if;
  if to_regclass('public.postal_codes') is not null then
    drop policy if exists p_postal_codes_public_read on public.postal_codes;
  end if;
  if to_regclass('public.specialist_services') is not null then
    drop policy if exists p_specialist_services_public_read on public.specialist_services;
  end if;
  if to_regclass('public.specialist_service_translations') is not null then
    drop policy if exists p_specialist_service_translations_public_read
      on public.specialist_service_translations;
  end if;
  if to_regclass('public.specialist_profile_translations') is not null then
    drop policy if exists p_specialist_profile_translations_public_read
      on public.specialist_profile_translations;
  end if;
  if to_regclass('public.specialist_reviews') is not null then
    drop policy if exists p_specialist_reviews_public_read on public.specialist_reviews;
  end if;
end
$$;

-- Revert views back to definer semantics (original advisor warning state).
alter view if exists public.category_specialist_counts set (security_invoker = false);
alter view if exists public.homepage_popular_categories_view set (security_invoker = false);
alter view if exists public.search_specialists set (security_invoker = false);
alter view if exists public.specialist_rating_stats set (security_invoker = false);
alter view if exists public.v_searchable_categories set (security_invoker = false);

alter view if exists public.growth_category_opportunities_view set (security_invoker = false);
alter view if exists public.growth_content_tasks_view set (security_invoker = false);
alter view if exists public.growth_scout_prospects_view set (security_invoker = false);
alter view if exists public.growth_market_signals_view set (security_invoker = false);
alter view if exists public.growth_crm_sync_log_view set (security_invoker = false);
alter view if exists public.growth_content_tasks_operator_view set (security_invoker = false);
alter view if exists public.growth_scout_prospects_operator_view set (security_invoker = false);
alter view if exists public.growth_operator_daily_actions_view set (security_invoker = false);
alter view if exists public.growth_category_opportunities_operator_view set (security_invoker = false);

-- Optional grant rollback template (uncomment only if you need to restore direct access):
-- grant select on table public.search_events to anon, authenticated;
-- grant select, insert on table public.profile_view_events to anon, authenticated;

commit;

-- ---------------------------------------------------------------------------
-- EMERGENCY-ONLY section (DO NOT run in normal rollback)
-- ---------------------------------------------------------------------------
-- If production is critically impacted and policy-level rollback is insufficient,
-- you can temporarily disable RLS for specific tables:
-- alter table public.specialist_services disable row level security;
-- alter table public.specialist_service_translations disable row level security;
-- alter table public.specialist_profile_translations disable row level security;
-- alter table public.specialist_reviews disable row level security;
-- alter table public.search_events disable row level security;
-- alter table public.profile_view_events disable row level security;
-- alter table public.languages disable row level security;
-- alter table public.cities disable row level security;
-- alter table public.postal_codes disable row level security;
-- alter table public.category_seo_templates disable row level security;
-- alter table public.homepage_popular_categories disable row level security;
