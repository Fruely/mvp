-- Freuly Growth System: public search collector
-- Purpose: collect public market signals from open web search results.

create table if not exists public.market_search_queries (
  id uuid primary key default gen_random_uuid(),

  query text not null,
  country text default 'Germany',
  region text,
  language_hint text,

  category_hint text,
  subcategory_hint text,
  intent_hint text,

  source_platform_hint text,
  enabled boolean not null default true,
  priority integer not null default 50,

  last_run_at timestamptz,
  run_count integer not null default 0,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.raw_market_items (
  id uuid primary key default gen_random_uuid(),

  source_platform text,
  source_type text not null default 'search_result',
  source_url text,
  source_title text,
  source_text text not null,

  search_query_id uuid references public.market_search_queries(id) on delete set null,
  search_query text,

  country text default 'Germany',
  region text,
  city_candidate text,
  language_hint text,

  category_hint text,
  subcategory_hint text,
  intent_hint text,

  raw_hash text unique,
  provider text,
  provider_rank integer,
  raw_payload jsonb not null default '{}'::jsonb,

  status text not null default 'new',
  processed_at timestamptz,
  notes text,

  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_market_search_queries_enabled_priority
  on public.market_search_queries(enabled, priority desc);

create index if not exists idx_raw_market_items_status
  on public.raw_market_items(status);

create index if not exists idx_raw_market_items_raw_hash
  on public.raw_market_items(raw_hash);

create index if not exists idx_raw_market_items_collected_at
  on public.raw_market_items(collected_at desc);

insert into public.market_search_queries
  (query, country, region, language_hint, category_hint, subcategory_hint, intent_hint, source_platform_hint, priority, notes)
values
  ('ищу электрика Düsseldorf русский', 'Germany', 'NRW', 'ru', 'repair', 'electrician', 'demand', 'web', 90, 'Seed query for public search collector'),
  ('посоветуйте электрика NRW русский', 'Germany', 'NRW', 'ru', 'repair', 'electrician', 'demand', 'web', 85, 'Seed query for public search collector'),
  ('маникюр Bonn русский', 'Germany', 'NRW', 'ru', 'beauty', 'manicure', 'mixed', 'web', 80, 'Seed query for public search collector'),
  ('маникюр Köln украинский', 'Germany', 'NRW', 'uk', 'beauty', 'manicure', 'mixed', 'web', 80, 'Seed query for public search collector'),
  ('юрист аренда Essen русский', 'Germany', 'NRW', 'ru', 'legal-services', 'lawyer', 'demand', 'web', 75, 'Seed query for public search collector'),
  ('бухгалтер Finanzamt Köln русский', 'Germany', 'NRW', 'ru', 'business-services', 'accountant', 'mixed', 'web', 75, 'Seed query for public search collector'),
  ('репетитор немецкого ребенку Германия украинский', 'Germany', null, 'uk', 'tutoring', 'german_tutor', 'demand', 'web', 70, 'Seed query for public search collector')
on conflict do nothing;
