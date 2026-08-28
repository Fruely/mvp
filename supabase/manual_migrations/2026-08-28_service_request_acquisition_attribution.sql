-- First-touch acquisition attribution for client service requests.
-- Values are captured only after analytics consent, except existing explicit
-- client_campaign_link_id attribution which remains unchanged.

alter table public.service_requests
  add column if not exists acquisition_source text null,
  add column if not exists acquisition_medium text null,
  add column if not exists acquisition_campaign text null,
  add column if not exists acquisition_referrer text null,
  add column if not exists acquisition_landing_path text null,
  add column if not exists acquisition_captured_at timestamptz null;

create index if not exists service_requests_acquisition_source_idx
  on public.service_requests (acquisition_source)
  where acquisition_source is not null;

comment on column public.service_requests.acquisition_source is
  'First-touch acquisition source captured after analytics consent (e.g. google, threads, instagram, telegram, direct).';
comment on column public.service_requests.acquisition_medium is
  'First-touch utm_medium when present.';
comment on column public.service_requests.acquisition_campaign is
  'First-touch utm_campaign when present.';
comment on column public.service_requests.acquisition_referrer is
  'External first-touch document.referrer, truncated by the application.';
comment on column public.service_requests.acquisition_landing_path is
  'First Freuly path/query seen at acquisition capture.';
comment on column public.service_requests.acquisition_captured_at is
  'Timestamp when first-touch acquisition data was captured.';
