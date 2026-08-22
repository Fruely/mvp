-- Content Hub MVP: isolated article storage only.
-- Additive migration. Does not modify existing tables, auth, billing, Stripe,
-- specialist flows, search, or public profile data.

create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  lang text not null,
  slug text not null,
  title text not null,
  excerpt text not null default '',
  body_markdown text not null default '',
  content_type text not null,
  status text not null default 'draft',
  hero_image_url text null,
  seo_title text null,
  seo_description text null,
  cta_type text not null default 'none',
  cta_label text null,
  cta_href text null,
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint content_posts_lang_check
    check (lang in ('ru', 'ua', 'de')),
  constraint content_posts_slug_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint content_posts_content_type_check
    check (content_type in (
      'specialist_story',
      'freuly_news',
      'guide',
      'entrepreneur_life'
    )),
  constraint content_posts_status_check
    check (status in ('draft', 'published')),
  constraint content_posts_cta_type_check
    check (cta_type in ('none', 'search', 'specialist', 'become_specialist')),
  constraint content_posts_lang_slug_key
    unique (lang, slug)
);

create index if not exists content_posts_public_list_idx
  on public.content_posts (lang, status, published_at desc);

alter table public.content_posts enable row level security;

comment on table public.content_posts is
  'Freuly Content Hub MVP posts. Server-side service-role access only in MVP.';
