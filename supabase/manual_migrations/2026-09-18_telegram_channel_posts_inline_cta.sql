-- Optional Telegram URL button stored with each channel post.
-- Existing posts remain valid and continue publishing without a button.

alter table public.telegram_channel_posts
  add column if not exists cta_label text null,
  add column if not exists cta_url text null;

alter table public.telegram_channel_posts
  drop constraint if exists telegram_channel_posts_cta_pair_check,
  add constraint telegram_channel_posts_cta_pair_check
    check ((cta_label is null) = (cta_url is null)),
  drop constraint if exists telegram_channel_posts_cta_label_check,
  add constraint telegram_channel_posts_cta_label_check
    check (cta_label is null or char_length(trim(cta_label)) between 1 and 64),
  drop constraint if exists telegram_channel_posts_cta_url_check,
  add constraint telegram_channel_posts_cta_url_check
    check (
      cta_url is null
      or (
        char_length(trim(cta_url)) between 1 and 2048
        and cta_url ~* '^https?://'
      )
    );

comment on column public.telegram_channel_posts.cta_label is
  'Optional label for the Telegram inline URL button.';

comment on column public.telegram_channel_posts.cta_url is
  'Optional HTTP(S) destination for the Telegram inline URL button.';
