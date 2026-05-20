-- Freuly Growth System tables
-- Market Radar / Scout Agent / Content Engine / CRM Sync
-- Created: 2026-05-20

-- 1. Market signals
-- Stores raw market observations:
-- supply = specialist offers a service
-- demand = client searches for a service

create table if not exists public.market_signals (
  id uuid primary key default gen_random_uuid(),

  signal_type text not null check (signal_type in ('supply', 'demand')),

  country text not null default 'Germany',
  region text,
  city text,

  language_detected text,
  category_slug text,
  subcategory_candidate text,

  source_platform text,
  source_url text,
  source_text text,
  signal_text text,

  has_instagram boolean not null default false,
  has_telegram boolean not null default false,
  has_facebook boolean not null default false,
  has_website boolean not null default false,
  has_email boolean not null default false,
  has_phone boolean not null default false,

  is_self_employed_signal boolean not null default false,
  is_business_offer boolean not null default false,

  confidence numeric check (confidence is null or (confidence >= 0 and confidence <= 1)),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_market_signals_signal_type
  on public.market_signals(signal_type);

create index if not exists idx_market_signals_country_region_city
  on public.market_signals(country, region, city);

create index if not exists idx_market_signals_category_slug
  on public.market_signals(category_slug);

create index if not exists idx_market_signals_created_at
  on public.market_signals(created_at desc);


-- 2. Category opportunities
-- Stores aggregated business conclusions based on supply/demand signals.

create table if not exists public.category_opportunities (
  id uuid primary key default gen_random_uuid(),

  country text not null default 'Germany',
  region text,
  city text,

  category_slug text not null,
  subcategory_candidate text,

  supply_count integer not null default 0 check (supply_count >= 0),
  demand_count integer not null default 0 check (demand_count >= 0),
  unique_source_count integer not null default 0 check (unique_source_count >= 0),

  main_channels text[] not null default '{}',

  market_density text check (
    market_density is null
    or market_density in ('low', 'medium', 'high', 'very_high')
  ),

  supply_demand_balance text check (
    supply_demand_balance is null
    or supply_demand_balance in (
      'supply_higher',
      'demand_higher',
      'balanced',
      'insufficient_data'
    )
  ),

  opportunity_score integer check (
    opportunity_score is null
    or (opportunity_score >= 0 and opportunity_score <= 100)
  ),

  recommended_action text,
  ai_summary text,

  last_calculated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_category_opportunities_location
  on public.category_opportunities(country, region, city);

create index if not exists idx_category_opportunities_category
  on public.category_opportunities(category_slug);

create index if not exists idx_category_opportunities_score
  on public.category_opportunities(opportunity_score desc nulls last);


-- 3. Scout prospects
-- Stores potential specialists discovered from public market signals.
-- This is not the registered specialists table.

create table if not exists public.scout_prospects (
  id uuid primary key default gen_random_uuid(),

  source_signal_id uuid references public.market_signals(id) on delete set null,

  source_type text,
  source_platform text,
  source_url text,
  source_text text,

  name text,
  business_name text,
  service_summary text,

  country text not null default 'Germany',
  region text,
  city text,

  language_detected text,
  languages text[] not null default '{}',

  category_slug text,
  subcategory_candidate text,

  phone text,
  email text,
  website text,
  instagram text,
  telegram text,
  facebook text,
  linkedin text,

  available_channels text[] not null default '{}',
  preferred_contact_channel text,
  backup_contact_channel text,
  contact_channel_reason text,
  contact_risk_level text check (
    contact_risk_level is null
    or contact_risk_level in ('low', 'medium', 'high')
  ),

  ai_summary text,
  ai_score integer check (ai_score is null or (ai_score >= 0 and ai_score <= 100)),
  ai_confidence numeric check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1)),

  status text not null default 'new' check (
    status in (
      'new',
      'review_needed',
      'approved',
      'contacted',
      'replied',
      'interested',
      'registered',
      'not_relevant',
      'duplicate',
      'do_not_contact'
    )
  ),

  outreach_status text not null default 'not_contacted' check (
    outreach_status in (
      'not_contacted',
      'message_prepared',
      'message_sent',
      'replied',
      'no_response',
      'do_not_contact'
    )
  ),

  duplicate_key text,
  duplicate_of uuid references public.scout_prospects(id) on delete set null,

  crm_external_id text,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scout_prospects_status
  on public.scout_prospects(status);

create index if not exists idx_scout_prospects_outreach_status
  on public.scout_prospects(outreach_status);

create index if not exists idx_scout_prospects_location
  on public.scout_prospects(country, region, city);

create index if not exists idx_scout_prospects_category
  on public.scout_prospects(category_slug);

create index if not exists idx_scout_prospects_duplicate_key
  on public.scout_prospects(duplicate_key);


-- 4. Content tasks
-- Stores content ideas and ready drafts for Threads/Telegram/Facebook/SEO.

create table if not exists public.content_tasks (
  id uuid primary key default gen_random_uuid(),

  source_opportunity_id uuid references public.category_opportunities(id) on delete set null,
  source_signal_id uuid references public.market_signals(id) on delete set null,

  content_goal text not null check (
    content_goal in ('attract_specialists', 'attract_clients', 'seo', 'brand', 'other')
  ),

  channel text not null check (
    channel in ('threads', 'telegram', 'facebook', 'instagram', 'seo', 'other')
  ),

  content_type text not null default 'post' check (
    content_type in ('post', 'thread', 'seo_page', 'ad_idea', 'message', 'other')
  ),

  country text not null default 'Germany',
  region text,
  city text,

  category_slug text,
  subcategory_candidate text,

  target_audience text,
  topic text not null,
  angle text,

  source_insight text,

  draft_text text,
  cta text,

  priority integer not null default 50 check (priority >= 0 and priority <= 100),

  status text not null default 'idea' check (
    status in (
      'idea',
      'draft_ready',
      'needs_review',
      'approved',
      'published',
      'rejected'
    )
  ),

  publish_date date,
  published_url text,

  crm_external_id text,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_tasks_status
  on public.content_tasks(status);

create index if not exists idx_content_tasks_channel
  on public.content_tasks(channel);

create index if not exists idx_content_tasks_goal
  on public.content_tasks(content_goal);

create index if not exists idx_content_tasks_priority
  on public.content_tasks(priority desc);

create index if not exists idx_content_tasks_publish_date
  on public.content_tasks(publish_date);


-- 5. CRM sync log
-- Stores sync results between Supabase and external CRM/Baserow.

create table if not exists public.crm_sync_log (
  id uuid primary key default gen_random_uuid(),

  entity_type text not null check (
    entity_type in (
      'specialist',
      'subscription',
      'lead',
      'market_signal',
      'category_opportunity',
      'scout_prospect',
      'content_task',
      'other'
    )
  ),

  entity_id uuid not null,

  crm_name text not null default 'baserow',
  crm_table_name text,
  crm_external_id text,

  sync_direction text not null default 'supabase_to_crm' check (
    sync_direction in ('supabase_to_crm', 'crm_to_supabase')
  ),

  sync_status text not null check (
    sync_status in ('success', 'failed', 'skipped')
  ),

  error_message text,
  payload jsonb,

  synced_at timestamptz not null default now()
);

create index if not exists idx_crm_sync_log_entity
  on public.crm_sync_log(entity_type, entity_id);

create index if not exists idx_crm_sync_log_status
  on public.crm_sync_log(sync_status);

create index if not exists idx_crm_sync_log_synced_at
  on public.crm_sync_log(synced_at desc);


-- 6. Shared updated_at trigger helper

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_market_signals_updated_at on public.market_signals;
create trigger set_market_signals_updated_at
before update on public.market_signals
for each row
execute function public.set_updated_at();

drop trigger if exists set_category_opportunities_updated_at on public.category_opportunities;
create trigger set_category_opportunities_updated_at
before update on public.category_opportunities
for each row
execute function public.set_updated_at();

drop trigger if exists set_scout_prospects_updated_at on public.scout_prospects;
create trigger set_scout_prospects_updated_at
before update on public.scout_prospects
for each row
execute function public.set_updated_at();

drop trigger if exists set_content_tasks_updated_at on public.content_tasks;
create trigger set_content_tasks_updated_at
before update on public.content_tasks
for each row
execute function public.set_updated_at();

