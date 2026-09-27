-- Owned service requests may omit copied account identity.
-- Anonymous rows keep the previous name and contact requirement.
-- Apply manually. Does not change matching, conversations, or billing.

BEGIN;

ALTER TABLE public.service_requests
  ALTER COLUMN client_name DROP NOT NULL;

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_client_name_not_empty;

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_contact_required;

ALTER TABLE public.service_requests
  DROP CONSTRAINT IF EXISTS service_requests_anonymous_identity_required;

ALTER TABLE public.service_requests
  ADD CONSTRAINT service_requests_anonymous_identity_required
  CHECK (
    client_user_id IS NOT NULL
    OR (
      client_name IS NOT NULL
      AND length(trim(client_name)) > 0
      AND (
        (client_email IS NOT NULL AND length(trim(client_email)) > 0)
        OR (client_phone IS NOT NULL AND length(trim(client_phone)) > 0)
      )
    )
  );

COMMENT ON CONSTRAINT service_requests_anonymous_identity_required ON public.service_requests IS
  'Anonymous rows require a name and an email or phone. Owned rows (client_user_id set) may omit copied identity.';

COMMIT;
