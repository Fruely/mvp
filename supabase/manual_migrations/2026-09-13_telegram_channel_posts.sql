-- Telegram channel post queue for Freuly-owned marketing channels.
-- Additive migration. Does not modify specialist Telegram notifications.

create table if not exists public.telegram_channel_posts (
  id uuid primary key default gen_random_uuid(),
  title text null,
  body_text text not null,
  status text not null default 'draft',
  scheduled_at timestamptz null,
  published_at timestamptz null,
  telegram_message_id bigint null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint telegram_channel_posts_status_check
    check (status in ('draft', 'scheduled', 'published', 'failed')),
  constraint telegram_channel_posts_body_text_check
    check (char_length(trim(body_text)) between 1 and 4096),
  constraint telegram_channel_posts_scheduled_check
    check (
      (status = 'scheduled' and scheduled_at is not null)
      or status <> 'scheduled'
    )
);

create index if not exists telegram_channel_posts_schedule_idx
  on public.telegram_channel_posts (status, scheduled_at asc)
  where status = 'scheduled';

create index if not exists telegram_channel_posts_created_idx
  on public.telegram_channel_posts (created_at desc);

alter table public.telegram_channel_posts enable row level security;

comment on table public.telegram_channel_posts is
  'Server-side queue for Freuly-owned Telegram channel posts.';
