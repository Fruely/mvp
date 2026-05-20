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

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_signals_type_idx
  on public.market_signals(signal_type);

create index if not exists market_signals_priority_idx
  on public.market_signals(priority_score desc);

create index if not exists market_signals_status_idx
  on public.market_signals(status);

create index if not exists market_signals_category_idx
  on public.market_signals(category_slug);

create index if not exists market_signals_city_idx
  on public.market_signals(city_slug);
