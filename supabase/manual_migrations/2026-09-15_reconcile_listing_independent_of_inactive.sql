-- Decouple public specialist listing from subscription lifecycle.
-- Additive replace of reconcile_specialist_access only.
-- inactive still means no covering subscription / locked contacts.
-- inactive MUST NOT set billing_visibility_blocked.
--
-- Also clears existing subscription-derived listing blocks so expired
-- subscribers remain publicly listed if otherwise eligible.
-- Do not drop specialists.billing_visibility_blocked.
--
-- Apply manually in Supabase SQL editor. Do not auto-run from CI/Cursor.

BEGIN;

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

  -- Listing eligibility is independent of subscription lifecycle.
  -- Inactive plan_status locks lead contacts; it must not hide an otherwise
  -- valid public profile. Clear any previously subscription-derived block.
  -- Never touches is_visible — admin/moderation ownership preserved.
  UPDATE public.specialists
  SET billing_visibility_blocked = false
  WHERE id = p_specialist_id
    AND billing_visibility_blocked IS DISTINCT FROM false;

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

-- Repair rows previously hidden only because subscription was inactive.
UPDATE public.specialists
SET billing_visibility_blocked = false
WHERE billing_visibility_blocked IS DISTINCT FROM false;

COMMIT;
