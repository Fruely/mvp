-- Additive only. Do NOT apply automatically.
-- Apply together with the ASCII URL code deploy (slug_legacy is selected at runtime).
--
-- Model:
--   specialists.slug         = canonical public ASCII identifier (source of truth)
--   specialists.slug_legacy  = previously published identifier (Cyrillic or garbled)
--
-- Uniqueness:
--   slug already has uq_specialists_slug
--   slug_legacy unique where not null
-- Collision suffix for new ASCII values: {base}, {base}-2, {base}-3, ...

alter table public.specialists
  add column if not exists slug_legacy text;

comment on column public.specialists.slug_legacy is
  'Previously published specialist slug (Cyrillic or garbled). Used only for lookup/redirects.';

create unique index if not exists uq_specialists_slug_legacy
  on public.specialists (slug_legacy)
  where slug_legacy is not null;

-- Known garbled aliases (exact). Only set when the canonical slug is already persisted
-- and slug_legacy is still empty.
update public.specialists
set slug_legacy = 'zkeiy-lbztieh'
where slug = 'cosmetologists-kassel-irina-melnik'
  and slug_legacy is null;

update public.specialists
set slug_legacy = 'nhliy-oyimbzeae'
where slug = 'psychologists-oksana-pantelidi'
  and slug_legacy is null;

update public.specialists
set slug_legacy = 'mymyzth-sbtbih'
where slug = 'business-kirchhundem-natalya-sheshenya'
  and slug_legacy is null;

-- If a row still has the garbled value as slug, move it to slug_legacy.
update public.specialists
set slug_legacy = slug,
    slug = 'cosmetologists-kassel-irina-melnik'
where slug = 'zkeiy-lbztieh'
  and not exists (
    select 1 from public.specialists s2
    where s2.slug = 'cosmetologists-kassel-irina-melnik'
      and s2.id <> specialists.id
  );

update public.specialists
set slug_legacy = slug,
    slug = 'psychologists-oksana-pantelidi'
where slug = 'nhliy-oyimbzeae'
  and not exists (
    select 1 from public.specialists s2
    where s2.slug = 'psychologists-oksana-pantelidi'
      and s2.id <> specialists.id
  );

update public.specialists
set slug_legacy = slug,
    slug = 'business-kirchhundem-natalya-sheshenya'
where slug = 'mymyzth-sbtbih'
  and not exists (
    select 1 from public.specialists s2
    where s2.slug = 'business-kirchhundem-natalya-sheshenya'
      and s2.id <> specialists.id
  );

-- ---------------------------------------------------------------------------
-- PREVIEW (run first, do not skip):
--
-- select id, name, slug
-- from public.specialists
-- where slug is not null
--   and slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$';
--
-- EXAMPLE backfill for one Cyrillic row (replace id / slugs after preview).
-- Collision: if 'anna-petrova' exists, use 'anna-petrova-2'.
--
-- update public.specialists
-- set slug_legacy = 'анна-петрова',
--     slug = 'anna-petrova'
-- where id = '11111111-1111-4111-8111-111111111111'
--   and slug = 'анна-петрова'
--   and not exists (
--     select 1 from public.specialists s2
--     where s2.slug = 'anna-petrova'
--       and s2.id <> '11111111-1111-4111-8111-111111111111'
--   );
-- ---------------------------------------------------------------------------

