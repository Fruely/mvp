-- Freuly cofounder badge flag for public specialist profiles.
-- Additive migration. Set is_freuly_cofounder = true manually in Supabase
-- for the intended specialist rows after applying this script.

alter table public.specialists
add column if not exists is_freuly_cofounder boolean not null default false;
