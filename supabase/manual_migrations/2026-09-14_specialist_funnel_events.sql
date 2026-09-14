-- Specialist acquisition / activation funnel event ledger.
-- Additive only. Designed for admin diagnostics and conversion analysis.
-- Apply to Supabase before deploying the admin funnel UI.

create table if not exists public.specialist_funnel_events (
  id uuid primary key default gen_random_uuid(),
  specialist_id uuid not null references public.specialists(id) on delete cascade,
  event_type text not null,
  event_key text not null,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint specialist_funnel_events_event_type_check check (
    event_type in (
      'registered',
      'dashboard_opened',
      'profile_started',
      'checkout_started',
      'paid',
      'published'
    )
  ),
  constraint specialist_funnel_events_event_key_unique unique (event_key)
);

create index if not exists specialist_funnel_events_specialist_idx
  on public.specialist_funnel_events (specialist_id, occurred_at desc);

create index if not exists specialist_funnel_events_type_time_idx
  on public.specialist_funnel_events (event_type, occurred_at desc);

alter table public.specialist_funnel_events enable row level security;

-- No public/client policies on purpose. Service-role/admin only.

create or replace function public.capture_specialist_funnel_event(
  p_specialist_id uuid,
  p_event_type text,
  p_occurred_at timestamptz,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_specialist_id is null or p_event_type is null then
    return;
  end if;

  insert into public.specialist_funnel_events (
    specialist_id,
    event_type,
    event_key,
    occurred_at,
    metadata
  )
  values (
    p_specialist_id,
    p_event_type,
    p_specialist_id::text || ':' || p_event_type,
    coalesce(p_occurred_at, now()),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (event_key) do nothing;
end;
$$;

revoke all on function public.capture_specialist_funnel_event(uuid, text, timestamptz, jsonb) from public;

create or replace function public.trg_capture_specialist_funnel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.capture_specialist_funnel_event(
      new.id,
      'registered',
      coalesce(new.created_at, now()),
      jsonb_build_object('source', 'specialists_insert')
    );

    if new.first_dashboard_visit_at is not null then
      perform public.capture_specialist_funnel_event(
        new.id,
        'dashboard_opened',
        new.first_dashboard_visit_at,
        jsonb_build_object('source', 'specialists_insert')
      );
    end if;

    if coalesce(new.dashboard_save_count, 0) > 0 then
      perform public.capture_specialist_funnel_event(
        new.id,
        'profile_started',
        coalesce(new.updated_at, new.created_at, now()),
        jsonb_build_object('source', 'specialists_insert')
      );
    end if;

    if new.published_at is not null then
      perform public.capture_specialist_funnel_event(
        new.id,
        'published',
        new.published_at,
        jsonb_build_object('source', 'specialists_insert')
      );
    end if;

    return new;
  end if;

  if old.first_dashboard_visit_at is null and new.first_dashboard_visit_at is not null then
    perform public.capture_specialist_funnel_event(
      new.id,
      'dashboard_opened',
      new.first_dashboard_visit_at,
      jsonb_build_object('source', 'specialists_update')
    );
  end if;

  if coalesce(old.dashboard_save_count, 0) = 0 and coalesce(new.dashboard_save_count, 0) > 0 then
    perform public.capture_specialist_funnel_event(
      new.id,
      'profile_started',
      coalesce(new.updated_at, now()),
      jsonb_build_object('source', 'dashboard_save')
    );
  end if;

  if old.published_at is null and new.published_at is not null then
    perform public.capture_specialist_funnel_event(
      new.id,
      'published',
      new.published_at,
      jsonb_build_object('source', 'specialists_update')
    );
  end if;

  return new;
end;
$$;

drop trigger if exists capture_specialist_funnel on public.specialists;
create trigger capture_specialist_funnel
after insert or update of first_dashboard_visit_at, dashboard_save_count, published_at
on public.specialists
for each row execute function public.trg_capture_specialist_funnel();

create or replace function public.trg_capture_plan_payment_funnel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.specialist_id is null then
    return new;
  end if;

  if new.status = 'checkout_created' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.capture_specialist_funnel_event(
      new.specialist_id,
      'checkout_started',
      coalesce(new.updated_at, new.created_at, now()),
      jsonb_build_object('source', 'plan_payments', 'plan_payment_id', new.id)
    );
  end if;

  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    perform public.capture_specialist_funnel_event(
      new.specialist_id,
      'paid',
      coalesce(new.paid_at, new.updated_at, new.created_at, now()),
      jsonb_build_object('source', 'plan_payments', 'plan_payment_id', new.id)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists capture_plan_payment_funnel on public.plan_payments;
create trigger capture_plan_payment_funnel
after insert or update of status
on public.plan_payments
for each row execute function public.trg_capture_plan_payment_funnel();

-- Backfill milestones that already have trustworthy persisted timestamps/state.
insert into public.specialist_funnel_events (specialist_id, event_type, event_key, occurred_at, metadata)
select id, 'registered', id::text || ':registered', coalesce(created_at, now()), '{"source":"backfill"}'::jsonb
from public.specialists
on conflict (event_key) do nothing;

insert into public.specialist_funnel_events (specialist_id, event_type, event_key, occurred_at, metadata)
select id, 'dashboard_opened', id::text || ':dashboard_opened', first_dashboard_visit_at, '{"source":"backfill"}'::jsonb
from public.specialists
where first_dashboard_visit_at is not null
on conflict (event_key) do nothing;

insert into public.specialist_funnel_events (specialist_id, event_type, event_key, occurred_at, metadata)
select id, 'profile_started', id::text || ':profile_started', coalesce(updated_at, created_at, now()), '{"source":"backfill_approximate_time"}'::jsonb
from public.specialists
where coalesce(dashboard_save_count, 0) > 0
on conflict (event_key) do nothing;

insert into public.specialist_funnel_events (specialist_id, event_type, event_key, occurred_at, metadata)
select id, 'published', id::text || ':published', published_at, '{"source":"backfill"}'::jsonb
from public.specialists
where published_at is not null
on conflict (event_key) do nothing;

insert into public.specialist_funnel_events (specialist_id, event_type, event_key, occurred_at, metadata)
select specialist_id, 'checkout_started', specialist_id::text || ':checkout_started', min(coalesce(updated_at, created_at, now())), '{"source":"backfill_plan_payments"}'::jsonb
from public.plan_payments
where specialist_id is not null and status in ('checkout_created', 'paid', 'refunded', 'disputed')
group by specialist_id
on conflict (event_key) do nothing;

insert into public.specialist_funnel_events (specialist_id, event_type, event_key, occurred_at, metadata)
select specialist_id, 'paid', specialist_id::text || ':paid', min(coalesce(paid_at, updated_at, created_at, now())), '{"source":"backfill_plan_payments"}'::jsonb
from public.plan_payments
where specialist_id is not null and status in ('paid', 'refunded', 'disputed')
group by specialist_id
on conflict (event_key) do nothing;
