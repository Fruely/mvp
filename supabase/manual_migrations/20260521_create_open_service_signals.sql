create table if not exists public.open_service_signals (
  id uuid primary key default gen_random_uuid(),

  signal_hash text not null unique,

  source_platform text not null default 'google_search',
  source_url text not null,
  source_title text,
  source_snippet text,
  source_text_excerpt text,

  country text not null default 'Germany',
  region text,
  city text,

  language_detected text,
  service_description text,
  category_guess text,
  subcategory_guess text,
  signal_kind text not null default 'supply',
  market_cluster text,

  confidence_score integer not null default 50,
  ai_summary text,
  source_keywords jsonb not null default '[]'::jsonb,

  status text not null default 'new',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.open_service_signals
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists signal_hash text,
  add column if not exists source_platform text default 'google_search',
  add column if not exists source_url text,
  add column if not exists source_title text,
  add column if not exists source_snippet text,
  add column if not exists source_text_excerpt text,
  add column if not exists country text default 'Germany',
  add column if not exists region text,
  add column if not exists city text,
  add column if not exists language_detected text,
  add column if not exists service_description text,
  add column if not exists category_guess text,
  add column if not exists subcategory_guess text,
  add column if not exists signal_kind text default 'supply',
  add column if not exists market_cluster text,
  add column if not exists confidence_score integer default 50,
  add column if not exists ai_summary text,
  add column if not exists source_keywords jsonb default '[]'::jsonb,
  add column if not exists status text default 'new',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.open_service_signals
set
  source_platform = coalesce(source_platform, 'google_search'),
  country = coalesce(country, 'Germany'),
  signal_kind = coalesce(signal_kind, 'supply'),
  confidence_score = coalesce(confidence_score, 50),
  source_keywords = coalesce(source_keywords, '[]'::jsonb),
  status = coalesce(status, 'new'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.open_service_signals
  alter column signal_hash set not null,
  alter column source_platform set not null,
  alter column source_url set not null,
  alter column country set not null,
  alter column signal_kind set not null,
  alter column confidence_score set not null,
  alter column source_keywords set not null,
  alter column status set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'open_service_signals_pkey'
      and conrelid = 'public.open_service_signals'::regclass
  ) then
    alter table public.open_service_signals
      add constraint open_service_signals_pkey primary key (id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'open_service_signals_signal_hash_key'
      and conrelid = 'public.open_service_signals'::regclass
  ) then
    alter table public.open_service_signals
      add constraint open_service_signals_signal_hash_key unique (signal_hash);
  end if;
end $$;

create index if not exists open_service_signals_source_platform_idx
  on public.open_service_signals(source_platform);

create index if not exists open_service_signals_language_idx
  on public.open_service_signals(language_detected);

create index if not exists open_service_signals_category_idx
  on public.open_service_signals(category_guess);

create index if not exists open_service_signals_city_idx
  on public.open_service_signals(city);

create index if not exists open_service_signals_cluster_idx
  on public.open_service_signals(market_cluster);

create index if not exists open_service_signals_confidence_idx
  on public.open_service_signals(confidence_score desc);

create index if not exists open_service_signals_status_idx
  on public.open_service_signals(status);
