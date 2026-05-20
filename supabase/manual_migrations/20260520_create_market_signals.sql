create table if not exists public.market_signals (
  id uuid primary key default gen_random_uuid(),

  signal_hash text not null unique,

  signal_type text not null,
  source_table text not null,
  source_id text,

  title text not null,
  summary text,
  category_slug text,
  city_slug text,
  language_code text,

  priority_score integer not null default 0,
  confidence_score integer not null default 50,

  recommended_action text,
  payload jsonb not null default '{}'::jsonb,

  status text not null default 'new',
  operator_status text not null default 'new',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.market_signals
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists signal_hash text,
  add column if not exists signal_type text,
  add column if not exists source_table text,
  add column if not exists source_id text,
  add column if not exists title text,
  add column if not exists summary text,
  add column if not exists category_slug text,
  add column if not exists city_slug text,
  add column if not exists language_code text,
  add column if not exists priority_score integer default 0,
  add column if not exists confidence_score integer default 50,
  add column if not exists recommended_action text,
  add column if not exists payload jsonb default '{}'::jsonb,
  add column if not exists status text default 'new',
  add column if not exists operator_status text default 'new',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table public.market_signals
  drop constraint if exists market_signals_signal_type_check;

update public.market_signals
set
  priority_score = coalesce(priority_score, 0),
  confidence_score = coalesce(confidence_score, 50),
  payload = coalesce(payload, '{}'::jsonb),
  status = coalesce(status, 'new'),
  operator_status = coalesce(operator_status, 'new'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

alter table public.market_signals
  alter column signal_hash set not null,
  alter column signal_type set not null,
  alter column source_table set not null,
  alter column title set not null,
  alter column priority_score set not null,
  alter column confidence_score set not null,
  alter column payload set not null,
  alter column status set not null,
  alter column operator_status set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'market_signals_pkey'
      and conrelid = 'public.market_signals'::regclass
  ) then
    alter table public.market_signals
      add constraint market_signals_pkey primary key (id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'market_signals_signal_hash_key'
      and conrelid = 'public.market_signals'::regclass
  ) then
    alter table public.market_signals
      add constraint market_signals_signal_hash_key unique (signal_hash);
  end if;
end $$;

create index if not exists market_signals_type_idx
  on public.market_signals(signal_type);

create index if not exists market_signals_priority_idx
  on public.market_signals(priority_score desc);

create index if not exists market_signals_status_idx
  on public.market_signals(status);

create index if not exists market_signals_operator_status_idx
  on public.market_signals(operator_status);

create index if not exists market_signals_category_idx
  on public.market_signals(category_slug);

create index if not exists market_signals_city_idx
  on public.market_signals(city_slug);
