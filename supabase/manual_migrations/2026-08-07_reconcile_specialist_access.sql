-- Unified specialist access lifecycle reconciliation.
-- Determines lifecycle state (active / grace / inactive) from plan_payments ledger.
-- Updates specialist_plan.plan_status and specialists.billing_visibility_blocked.
-- Uses the same specialist-level advisory lock as fulfill_plan_payment_entitlement.
--
-- Safe to call for any event: refund, natural expiry, reactivation, cron sweep.
-- Handles two enrollment paths:
--   1. Billing history (plan_payments with entitlement_applied_at) — standard paid lifecycle.
--   2. lifecycle_enrolled_at (initial grace after first publication) — pre-payment grace.
-- Legacy / early-access specialists without either are explicitly skipped.
--
-- Apply manually in Supabase SQL editor AFTER plan_payment_fulfillment RPC exists.
-- Do not auto-run from CI/Cursor.

BEGIN;

-- Billing-owned visibility column: lifecycle inactive sets true, active/grace sets false.
-- Public visibility gate: status + is_active + is_visible + NOT billing_visibility_blocked.
-- Default false = legacy specialists remain publicly visible.
ALTER TABLE public.specialists
  ADD COLUMN IF NOT EXISTS billing_visibility_blocked boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_specialists_billing_visibility_blocked
  ON public.specialists (id) WHERE billing_visibility_blocked = true;

-- Lifecycle enrollment timestamp for new specialists after rollout.
-- Set once on first publication when LIFECYCLE_RECONCILIATION_ENABLED=true.
-- NULL = legacy specialist (not enrolled, grandfathered).
ALTER TABLE public.specialist_plan
  ADD COLUMN IF NOT EXISTS lifecycle_enrolled_at timestamptz;

CREATE OR REPLACE FUNCTION public.reconcile_specialist_access(
  p_specialist_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_plan              public.specialist_plan%ROWTYPE;
  v_max_paid_expires  timestamptz;
  v_paid_plan_code    text;
  v_max_refunded_at   timestamptz;
  v_natural_grace     timestamptz;
  v_refund_grace      timestamptz;
  v_initial_grace     timestamptz;
  v_best_grace        timestamptz;
  v_has_billing       boolean;
  v_new_status        text;
  v_new_grace_until   timestamptz;
  v_effective_plan    text;
  v_old_status        text;
  v_now               timestamptz := pg_catalog.now();
BEGIN
  IF p_specialist_id IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('outcome', 'invalid_input');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.plan_payments
    WHERE specialist_id = p_specialist_id
      AND entitlement_applied_at IS NOT NULL
      AND status IN ('paid', 'refunded')
  ) INTO v_has_billing;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('plan_payment_entitlement'),
    pg_catalog.hashtext(p_specialist_id::text)
  );

  SELECT *
  INTO v_plan
  FROM public.specialist_plan
  WHERE specialist_id = p_specialist_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF NOT v_has_billing THEN
      RETURN pg_catalog.jsonb_build_object('outcome', 'no_billing_history');
    END IF;
    RETURN pg_catalog.jsonb_build_object('outcome', 'no_plan_row');
  END IF;

  -- Neither billing history nor lifecycle enrollment → legacy, skip
  IF NOT v_has_billing AND v_plan.lifecycle_enrolled_at IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('outcome', 'no_billing_history');
  END IF;

  v_old_status := v_plan.plan_status;

  -- Gather paid coverage from ledger
  SELECT pp.period_end_at, pp.plan_code
  INTO v_max_paid_expires, v_paid_plan_code
  FROM public.plan_payments pp
  WHERE pp.specialist_id = p_specialist_id
    AND pp.status = 'paid'
    AND pp.entitlement_applied_at IS NOT NULL
    AND pp.period_end_at IS NOT NULL
  ORDER BY pp.period_end_at DESC
  LIMIT 1;

  SELECT pg_catalog.max(pp.refunded_at)
  INTO v_max_refunded_at
  FROM public.plan_payments pp
  WHERE pp.specialist_id = p_specialist_id
    AND pp.status = 'refunded'
    AND pp.entitlement_applied_at IS NOT NULL
    AND pp.refunded_at IS NOT NULL;

  -- Compute grace windows
  IF v_max_paid_expires IS NOT NULL THEN
    v_natural_grace := v_max_paid_expires + INTERVAL '7 days';
  END IF;

  IF v_max_refunded_at IS NOT NULL THEN
    v_refund_grace := v_max_refunded_at + INTERVAL '7 days';
  END IF;

  IF v_plan.lifecycle_enrolled_at IS NOT NULL THEN
    v_initial_grace := v_plan.lifecycle_enrolled_at + INTERVAL '7 days';
  END IF;

  -- Decision tree
  IF v_max_paid_expires IS NOT NULL AND v_max_paid_expires > v_now THEN
    -- ACTIVE: paid coverage still valid
    v_new_status := 'active';
    v_new_grace_until := v_natural_grace;
    v_effective_plan := v_paid_plan_code;

    UPDATE public.specialist_plan
    SET
      plan_code   = v_paid_plan_code,
      plan_status = 'active',
      expires_at  = v_max_paid_expires,
      grace_until = v_new_grace_until,
      updated_at  = v_now
    WHERE specialist_id = p_specialist_id;

  ELSE
    -- No active paid coverage — check grace windows
    v_best_grace := GREATEST(
      COALESCE(v_natural_grace,  '-infinity'::timestamptz),
      COALESCE(v_refund_grace,   '-infinity'::timestamptz),
      COALESCE(v_initial_grace,  '-infinity'::timestamptz)
    );

    v_effective_plan := COALESCE(v_paid_plan_code, v_plan.plan_code);

    IF v_best_grace > v_now THEN
      v_new_status := 'grace';
      v_new_grace_until := v_best_grace;

      UPDATE public.specialist_plan
      SET
        plan_code   = v_effective_plan,
        plan_status = 'grace',
        expires_at  = v_max_paid_expires,
        grace_until = v_new_grace_until,
        updated_at  = v_now
      WHERE specialist_id = p_specialist_id;

    ELSE
      v_new_status := 'inactive';
      v_new_grace_until := NULL;

      UPDATE public.specialist_plan
      SET
        plan_code   = v_effective_plan,
        plan_status = 'inactive',
        expires_at  = NULL,
        grace_until = NULL,
        updated_at  = v_now
      WHERE specialist_id = p_specialist_id;
    END IF;
  END IF;

  -- Billing visibility: set/clear the billing-owned marker.
  -- Never touches is_visible — admin/moderation ownership preserved.
  IF v_new_status = 'inactive' THEN
    UPDATE public.specialists
    SET billing_visibility_blocked = true
    WHERE id = p_specialist_id
      AND billing_visibility_blocked IS DISTINCT FROM true;
  ELSE
    UPDATE public.specialists
    SET billing_visibility_blocked = false
    WHERE id = p_specialist_id
      AND billing_visibility_blocked IS DISTINCT FROM false;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'outcome', CASE
      WHEN v_old_status IS DISTINCT FROM v_new_status THEN 'transitioned'
      ELSE 'unchanged'
    END,
    'specialist_id',   p_specialist_id,
    'lifecycle_status', v_new_status,
    'previous_status',  v_old_status,
    'expires_at',       v_max_paid_expires,
    'grace_until',      v_new_grace_until,
    'plan_code',        v_effective_plan
  );
END;
$$;

ALTER FUNCTION public.reconcile_specialist_access(uuid)
  OWNER TO postgres;

REVOKE ALL ON FUNCTION public.reconcile_specialist_access(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reconcile_specialist_access(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_specialist_access(uuid) TO service_role;

-- Update category_specialist_counts view to include billing_visibility_blocked gate
CREATE OR REPLACE VIEW public.category_specialist_counts AS
SELECT
  ss.category_id,
  COUNT(DISTINCT ss.specialist_id)::bigint AS specialists_count
FROM public.specialist_services ss
JOIN public.specialists s ON s.id = ss.specialist_id
WHERE
  ss.is_active = true
  AND ss.price_from >= 0
  AND s.status IN ('approved', 'published_unverified', 'featured_verified')
  AND s.is_active = true
  AND s.is_visible = true
  AND COALESCE(s.is_test, false) = false
  AND s.billing_visibility_blocked = false
GROUP BY ss.category_id;

-- Update search_specialists_local_radius to include billing_visibility_blocked gate
CREATE OR REPLACE FUNCTION public.search_specialists_local_radius(
  p_ref_lat double precision,
  p_ref_lng double precision,
  p_radius_km double precision,
  p_lang text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_mode text DEFAULT NULL,
  p_offset integer DEFAULT 0,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  name text,
  postal_code text,
  lat double precision,
  lng double precision,
  work_format text,
  category_id uuid,
  languages text[],
  is_pro boolean,
  rating numeric,
  distance double precision
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
AS $function$
DECLARE
  v_offset integer;
  v_limit integer;
BEGIN
  v_offset := GREATEST(COALESCE(p_offset, 0), 0);

  IF p_limit IS NULL THEN
    v_limit := 20;
  ELSIF p_limit <= 0 THEN
    v_limit := 0;
  ELSE
    v_limit := p_limit;
  END IF;

  IF p_mode IS NOT NULL AND p_mode NOT IN ('offline', 'hybrid', 'local') THEN
    RETURN;
  END IF;

  IF p_ref_lat IS NULL
     OR p_ref_lng IS NULL
     OR p_ref_lat < -90::double precision
     OR p_ref_lat > 90::double precision
     OR p_ref_lng < -180::double precision
     OR p_ref_lng > 180::double precision
     OR (p_ref_lat = 0::double precision AND p_ref_lng = 0::double precision)
  THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.postal_code,
    s.lat,
    s.lng,
    s.work_format,
    s.category_id,
    s.languages,
    s.is_pro,
    s.rating,
    d.dist AS distance
  FROM public.specialists s
  CROSS JOIN LATERAL (
    SELECT public.distance_km(p_ref_lat, p_ref_lng, s.lat, s.lng) AS dist
  ) d
  WHERE s.is_active IS TRUE
    AND s.is_visible IS TRUE
    AND s.billing_visibility_blocked IS NOT TRUE
    AND s.lat IS NOT NULL
    AND s.lng IS NOT NULL
    AND s.lat >= -90::double precision
    AND s.lat <= 90::double precision
    AND s.lng >= -180::double precision
    AND s.lng <= 180::double precision
    AND NOT (s.lat = 0::double precision AND s.lng = 0::double precision)
    AND (
      ((p_mode IS NULL OR p_mode = 'local') AND s.work_format IN ('offline', 'hybrid'))
      OR (p_mode = 'offline' AND s.work_format = 'offline')
      OR (p_mode = 'hybrid' AND s.work_format = 'hybrid')
    )
    AND s.service_radius_km IN (5, 10, 25, 50, 100)
    AND d.dist IS NOT NULL
    AND d.dist = d.dist
    AND d.dist <= p_radius_km
    AND d.dist <= s.service_radius_km::double precision
    AND (p_category_id IS NULL OR s.category_id = p_category_id)
    AND (
      p_lang IS NULL
      OR s.languages @> ARRAY[p_lang]::text[]
    )
  ORDER BY
    d.dist ASC,
    s.is_pro DESC,
    s.rating DESC NULLS LAST,
    s.id ASC
  OFFSET v_offset
  LIMIT v_limit;
END;
$function$;

ALTER FUNCTION public.search_specialists_local_radius(
  double precision, double precision, double precision, text, uuid, text, integer, integer
) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.search_specialists_local_radius(
  double precision, double precision, double precision, text, uuid, text, integer, integer
) TO PUBLIC;

GRANT EXECUTE ON FUNCTION public.search_specialists_local_radius(
  double precision, double precision, double precision, text, uuid, text, integer, integer
) TO anon, authenticated, service_role;

COMMIT;
