-- Safe-first Supabase Security Advisor fix
-- Scope: RLS enablement, minimal public policies, analytics lock-down, view security mode.
-- Idempotent by design: IF EXISTS / DO blocks / DROP POLICY IF EXISTS.

begin;

-- ---------------------------------------------------------------------------
-- A) Enable RLS on target tables
-- ---------------------------------------------------------------------------
alter table if exists public.specialist_services enable row level security;
alter table if exists public.specialist_service_translations enable row level security;
alter table if exists public.specialist_profile_translations enable row level security;
alter table if exists public.specialist_reviews enable row level security;
alter table if exists public.search_events enable row level security;
alter table if exists public.profile_view_events enable row level security;
alter table if exists public.languages enable row level security;
alter table if exists public.cities enable row level security;
alter table if exists public.postal_codes enable row level security;
alter table if exists public.category_seo_templates enable row level security;
alter table if exists public.homepage_popular_categories enable row level security;

-- ---------------------------------------------------------------------------
-- B) Public read policies for safe reference dictionaries only
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.languages') is not null then
    drop policy if exists p_languages_public_read on public.languages;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'languages'
        and column_name = 'is_active'
    ) then
      execute $sql$
        create policy p_languages_public_read
        on public.languages
        for select
        to anon, authenticated
        using (coalesce(is_active, true) = true)
      $sql$;
    else
      execute $sql$
        create policy p_languages_public_read
        on public.languages
        for select
        to anon, authenticated
        using (true)
      $sql$;
    end if;

    grant select on table public.languages to anon, authenticated;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.cities') is not null then
    drop policy if exists p_cities_public_read on public.cities;
    create policy p_cities_public_read
      on public.cities
      for select
      to anon, authenticated
      using (true);

    grant select on table public.cities to anon, authenticated;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.postal_codes') is not null then
    drop policy if exists p_postal_codes_public_read on public.postal_codes;
    create policy p_postal_codes_public_read
      on public.postal_codes
      for select
      to anon, authenticated
      using (true);

    grant select on table public.postal_codes to anon, authenticated;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- C) Public specialist data policies (paused is intentionally excluded)
--     NOTE: published_at is intentionally not required (legacy compatibility).
-- ---------------------------------------------------------------------------
do $$
declare
  has_is_test boolean;
begin
  if to_regclass('public.specialist_services') is not null
     and to_regclass('public.specialists') is not null then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'specialists'
        and column_name = 'is_test'
    )
    into has_is_test;

    drop policy if exists p_specialist_services_public_read on public.specialist_services;

    execute format(
      $sql$
      create policy p_specialist_services_public_read
      on public.specialist_services
      for select
      to anon, authenticated
      using (
        is_active = true
        and exists (
          select 1
          from public.specialists s
          where s.id = specialist_services.specialist_id
            and s.is_active = true
            and s.is_visible = true
            %s
            and s.status in ('approved', 'published_unverified', 'featured_verified')
        )
      )
      $sql$,
      case when has_is_test then 'and coalesce(s.is_test, false) = false' else '' end
    );
  end if;
end
$$;

do $$
declare
  has_is_test boolean;
begin
  if to_regclass('public.specialist_service_translations') is not null
     and to_regclass('public.specialist_services') is not null
     and to_regclass('public.specialists') is not null then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'specialists'
        and column_name = 'is_test'
    )
    into has_is_test;

    drop policy if exists p_specialist_service_translations_public_read
      on public.specialist_service_translations;

    execute format(
      $sql$
      create policy p_specialist_service_translations_public_read
      on public.specialist_service_translations
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.specialist_services ss
          join public.specialists s on s.id = ss.specialist_id
          where ss.id = specialist_service_translations.specialist_service_id
            and ss.is_active = true
            and s.is_active = true
            and s.is_visible = true
            %s
            and s.status in ('approved', 'published_unverified', 'featured_verified')
        )
      )
      $sql$,
      case when has_is_test then 'and coalesce(s.is_test, false) = false' else '' end
    );
  end if;
end
$$;

do $$
declare
  has_is_test boolean;
begin
  if to_regclass('public.specialist_profile_translations') is not null
     and to_regclass('public.specialists') is not null then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'specialists'
        and column_name = 'is_test'
    )
    into has_is_test;

    drop policy if exists p_specialist_profile_translations_public_read
      on public.specialist_profile_translations;

    execute format(
      $sql$
      create policy p_specialist_profile_translations_public_read
      on public.specialist_profile_translations
      for select
      to anon, authenticated
      using (
        exists (
          select 1
          from public.specialists s
          where s.id = specialist_profile_translations.specialist_id
            and s.is_active = true
            and s.is_visible = true
            %s
            and s.status in ('approved', 'published_unverified', 'featured_verified')
        )
      )
      $sql$,
      case when has_is_test then 'and coalesce(s.is_test, false) = false' else '' end
    );
  end if;
end
$$;

do $$
declare
  has_is_test boolean;
  has_reviews_is_visible boolean;
  has_specialist_id boolean;
begin
  if to_regclass('public.specialist_reviews') is not null
     and to_regclass('public.specialists') is not null then
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'specialists'
        and column_name = 'is_test'
    )
    into has_is_test;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'specialist_reviews'
        and column_name = 'is_visible'
    )
    into has_reviews_is_visible;

    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'specialist_reviews'
        and column_name = 'specialist_id'
    )
    into has_specialist_id;

    drop policy if exists p_specialist_reviews_public_read on public.specialist_reviews;

    if has_reviews_is_visible and has_specialist_id then
      execute format(
        $sql$
        create policy p_specialist_reviews_public_read
        on public.specialist_reviews
        for select
        to anon, authenticated
        using (
          is_visible = true
          and exists (
            select 1
            from public.specialists s
            where s.id = specialist_reviews.specialist_id
              and s.is_active = true
              and s.is_visible = true
              %s
              and s.status in ('approved', 'published_unverified', 'featured_verified')
          )
        )
        $sql$,
        case when has_is_test then 'and coalesce(s.is_test, false) = false' else '' end
      );
    end if;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- D) Analytics lock-down (no anon/authenticated direct access)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.search_events') is not null then
    revoke all on table public.search_events from anon, authenticated;
  end if;

  if to_regclass('public.profile_view_events') is not null then
    revoke all on table public.profile_view_events from anon, authenticated;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- E) Controversial tables: only RLS enablement (no public read policy)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.category_seo_templates') is not null then
    revoke all on table public.category_seo_templates from anon, authenticated;
  end if;

  if to_regclass('public.homepage_popular_categories') is not null then
    revoke all on table public.homepage_popular_categories from anon, authenticated;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- F) Views: security_invoker + growth grants lock-down
-- ---------------------------------------------------------------------------
alter view if exists public.category_specialist_counts set (security_invoker = true);
alter view if exists public.homepage_popular_categories_view set (security_invoker = true);
alter view if exists public.search_specialists set (security_invoker = true);
alter view if exists public.specialist_rating_stats set (security_invoker = true);
alter view if exists public.v_searchable_categories set (security_invoker = true);

alter view if exists public.growth_category_opportunities_view set (security_invoker = true);
alter view if exists public.growth_content_tasks_view set (security_invoker = true);
alter view if exists public.growth_scout_prospects_view set (security_invoker = true);
alter view if exists public.growth_market_signals_view set (security_invoker = true);
alter view if exists public.growth_crm_sync_log_view set (security_invoker = true);
alter view if exists public.growth_content_tasks_operator_view set (security_invoker = true);
alter view if exists public.growth_scout_prospects_operator_view set (security_invoker = true);
alter view if exists public.growth_operator_daily_actions_view set (security_invoker = true);
alter view if exists public.growth_category_opportunities_operator_view set (security_invoker = true);

do $$
begin
  if to_regclass('public.growth_category_opportunities_view') is not null then
    revoke all on table public.growth_category_opportunities_view from anon, authenticated;
  end if;
  if to_regclass('public.growth_content_tasks_view') is not null then
    revoke all on table public.growth_content_tasks_view from anon, authenticated;
  end if;
  if to_regclass('public.growth_scout_prospects_view') is not null then
    revoke all on table public.growth_scout_prospects_view from anon, authenticated;
  end if;
  if to_regclass('public.growth_market_signals_view') is not null then
    revoke all on table public.growth_market_signals_view from anon, authenticated;
  end if;
  if to_regclass('public.growth_crm_sync_log_view') is not null then
    revoke all on table public.growth_crm_sync_log_view from anon, authenticated;
  end if;
  if to_regclass('public.growth_content_tasks_operator_view') is not null then
    revoke all on table public.growth_content_tasks_operator_view from anon, authenticated;
  end if;
  if to_regclass('public.growth_scout_prospects_operator_view') is not null then
    revoke all on table public.growth_scout_prospects_operator_view from anon, authenticated;
  end if;
  if to_regclass('public.growth_operator_daily_actions_view') is not null then
    revoke all on table public.growth_operator_daily_actions_view from anon, authenticated;
  end if;
  if to_regclass('public.growth_category_opportunities_operator_view') is not null then
    revoke all on table public.growth_category_opportunities_operator_view from anon, authenticated;
  end if;
end
$$;

commit;
