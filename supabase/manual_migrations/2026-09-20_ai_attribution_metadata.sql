-- AI-specific acquisition metadata for service requests.
-- This is intentionally additive: existing acquisition_source remains the raw
-- first-touch source while these fields provide normalized AI attribution.
--
-- ai_agent is reserved for authenticated server-side Agent API traffic.
-- Browser/client attribution must only populate ai_referral.

alter table public.service_requests
  add column if not exists acquisition_channel text null,
  add column if not exists ai_provider text null,
  add column if not exists ai_interaction_type text null,
  add column if not exists acquisition_attribution_confidence text null;

alter table public.service_requests
  drop constraint if exists service_requests_ai_interaction_type_check,
  add constraint service_requests_ai_interaction_type_check
    check (ai_interaction_type is null or ai_interaction_type in ('ai_referral', 'ai_agent'));

alter table public.service_requests
  drop constraint if exists service_requests_acquisition_attribution_confidence_check,
  add constraint service_requests_acquisition_attribution_confidence_check
    check (
      acquisition_attribution_confidence is null
      or acquisition_attribution_confidence in ('high', 'medium', 'low')
    );

create index if not exists service_requests_acquisition_channel_created_idx
  on public.service_requests (acquisition_channel, created_at desc)
  where acquisition_channel is not null;

create index if not exists service_requests_ai_provider_created_idx
  on public.service_requests (ai_provider, created_at desc)
  where ai_provider is not null;

comment on column public.service_requests.acquisition_channel is
  'Normalized acquisition channel. AI-originated demand uses ai; other channels may be normalized later without changing acquisition_source.';
comment on column public.service_requests.ai_provider is
  'Normalized AI provider/source such as chatgpt, gemini, claude, perplexity, copilot, grok or poe.';
comment on column public.service_requests.ai_interaction_type is
  'ai_referral for human browser traffic referred by AI; ai_agent is reserved for authenticated programmatic Agent API traffic.';
comment on column public.service_requests.acquisition_attribution_confidence is
  'Confidence of normalized attribution: high, medium or low. For AI browser referrals, matching referrer is high and source-only attribution is medium.';
