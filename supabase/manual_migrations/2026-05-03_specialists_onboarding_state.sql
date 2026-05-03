alter table public.specialists
add column if not exists onboarding_state jsonb not null default '{}'::jsonb;
