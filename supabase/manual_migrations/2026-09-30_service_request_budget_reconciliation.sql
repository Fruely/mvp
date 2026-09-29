-- Additive budget reconciliation.
-- Manual only. Do not apply from application deploy.
-- Existing rows stay valid: every new column is nullable and existing
-- specialist services keep minimum_order_cents NULL.
-- This file does not edit Phase 1, Phase 2, or Phase 3A migrations.

alter table public.specialist_services
  add column if not exists minimum_order_cents integer;

alter table public.specialist_services
  drop constraint if exists specialist_services_minimum_order_cents_check;

alter table public.specialist_services
  add constraint specialist_services_minimum_order_cents_check
  check (minimum_order_cents is null or minimum_order_cents >= 0);

comment on column public.specialist_services.minimum_order_cents is
  'Optional explicit minimum accepted job/order value in EUR cents, used only for demand economic eligibility. Not price_from, not the displayed service price, and not the Freuly access price. Null means no economic floor.';

alter table public.service_requests
  add column if not exists budget_reconciliation_required_cents integer,
  add column if not exists budget_reconciliation_accepted_cents integer,
  add column if not exists budget_reconciliation_accepted_at timestamptz,
  add column if not exists budget_reconciliation_declined_at timestamptz;

alter table public.service_requests
  drop constraint if exists service_requests_budget_reconciliation_required_cents_check;

alter table public.service_requests
  add constraint service_requests_budget_reconciliation_required_cents_check
  check (
    budget_reconciliation_required_cents is null
    or budget_reconciliation_required_cents >= 0
  );

alter table public.service_requests
  drop constraint if exists service_requests_budget_reconciliation_accepted_cents_check;

alter table public.service_requests
  add constraint service_requests_budget_reconciliation_accepted_cents_check
  check (
    budget_reconciliation_accepted_cents is null
    or budget_reconciliation_accepted_cents >= 0
  );

alter table public.service_requests
  drop constraint if exists service_requests_budget_reconciliation_accepted_at_check;

alter table public.service_requests
  add constraint service_requests_budget_reconciliation_accepted_at_check
  check (
    budget_reconciliation_accepted_at is null
    or budget_reconciliation_accepted_cents is not null
  );

comment on column public.service_requests.budget_reconciliation_required_cents is
  'Unresolved lowest explicit minimum order value, in EUR cents, among otherwise-eligible specialists blocked only by budget. Not a service_request status and not the Freuly access price.';

comment on column public.service_requests.budget_reconciliation_accepted_cents is
  'Client-confirmed economic ceiling in EUR cents. Supersedes the parsed maximum of client_budget_text for later matching and for newly created offers. Does not rewrite client_budget_text.';

comment on column public.service_requests.budget_reconciliation_accepted_at is
  'When the client accepted the then-persisted required ceiling. Requires accepted cents.';

comment on column public.service_requests.budget_reconciliation_declined_at is
  'When the client declined the current unresolved required ceiling. A later different required ceiling must not reuse this decline.';
