-- Additive client-contract capabilities for native installations.
-- Existing rows stay empty. Nothing is backfilled to paid_request_access_v1.
-- Apply manually before deploying the backend that reads this column.
-- Do not run from CI and do not apply from the app.

BEGIN;

ALTER TABLE public.native_installations
  ADD COLUMN IF NOT EXISTS capabilities text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.native_installations.capabilities IS
  'Client contract capabilities advertised by the current registration. paid_request_access_v1 means the installed app understands service-request access_offer and reserve-first TAKE. It is not payment, entitlement, subscription, or push permission. Registration replaces this set; it is not a permanent union. An empty set keeps the legacy-compatible consumer path for new paid offers.';

COMMIT;
