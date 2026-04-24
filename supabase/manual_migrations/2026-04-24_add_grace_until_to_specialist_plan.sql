-- Grace period end after subscription expiration (additive).
alter table public.specialist_plan
  add column if not exists grace_until timestamptz null;

comment on column public.specialist_plan.grace_until
  is 'End of the grace period after subscription expiration.';
