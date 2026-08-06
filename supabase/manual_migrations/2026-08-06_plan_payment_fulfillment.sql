-- Phase 4G-C: atomic plan payment entitlement fulfillment RPC.
-- Apply manually in Supabase SQL editor AFTER plan_payments exists.
-- Do not auto-run from CI/Cursor.

BEGIN;

CREATE OR REPLACE FUNCTION public.fulfill_plan_payment_entitlement(
  p_plan_payment_id uuid,
  p_paid_at timestamptz,
  p_stripe_payment_intent_id text,
  p_stripe_charge_id text,
  p_stripe_checkout_session_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_payment public.plan_payments%ROWTYPE;
  v_plan public.specialist_plan%ROWTYPE;
  v_prior_expires timestamptz;
  v_base timestamptz;
  v_new_expires timestamptz;
  v_grace timestamptz;
  v_credit public.promoted_request_subscription_credits%ROWTYPE;
  v_now timestamptz := pg_catalog.now();
  v_paid_at timestamptz;
  v_credit_consumed boolean := false;
  v_plan_created boolean := false;
BEGIN
  IF p_plan_payment_id IS NULL
    OR p_paid_at IS NULL
    OR p_stripe_payment_intent_id IS NULL
    OR p_stripe_checkout_session_id IS NULL THEN
    RETURN pg_catalog.jsonb_build_object('outcome', 'invalid_input');
  END IF;

  SELECT *
  INTO v_payment
  FROM public.plan_payments
  WHERE id = p_plan_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN pg_catalog.jsonb_build_object('outcome', 'not_found');
  END IF;

  IF v_payment.stripe_checkout_session_id IS NOT NULL
    AND v_payment.stripe_checkout_session_id IS DISTINCT FROM p_stripe_checkout_session_id THEN
    RAISE EXCEPTION 'plan_payment_session_mismatch';
  END IF;

  IF v_payment.stripe_payment_intent_id IS NOT NULL
    AND v_payment.stripe_payment_intent_id IS DISTINCT FROM p_stripe_payment_intent_id THEN
    RAISE EXCEPTION 'plan_payment_intent_mismatch';
  END IF;

  IF v_payment.stripe_charge_id IS NOT NULL
    AND p_stripe_charge_id IS NOT NULL
    AND v_payment.stripe_charge_id IS DISTINCT FROM p_stripe_charge_id THEN
    RAISE EXCEPTION 'plan_payment_charge_mismatch';
  END IF;

  IF v_payment.entitlement_applied_at IS NOT NULL THEN
    RETURN pg_catalog.jsonb_build_object(
      'outcome', 'already_applied',
      'plan_payment_id', v_payment.id,
      'specialist_id', v_payment.specialist_id,
      'prior_expires_at', v_payment.prior_expires_at,
      'period_end_at', v_payment.period_end_at,
      'promoted_credit_consumed', v_payment.promoted_credit_id IS NOT NULL,
      'paid_at', v_payment.paid_at
    );
  END IF;

  IF v_payment.status NOT IN ('checkout_created', 'paid') THEN
    RETURN pg_catalog.jsonb_build_object(
      'outcome', 'invalid_status',
      'status', v_payment.status
    );
  END IF;

  v_paid_at := COALESCE(v_payment.paid_at, p_paid_at);

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('plan_payment_entitlement'),
    pg_catalog.hashtext(v_payment.specialist_id::text)
  );

  WITH inserted AS (
    INSERT INTO public.specialist_plan (
      specialist_id,
      plan_code,
      plan_status,
      started_at,
      expires_at,
      grace_until,
      created_at,
      updated_at
    ) VALUES (
      v_payment.specialist_id,
      v_payment.plan_code,
      'active',
      v_paid_at,
      v_paid_at,
      v_paid_at,
      v_now,
      v_now
    )
    ON CONFLICT (specialist_id) DO NOTHING
    RETURNING specialist_id
  )
  SELECT EXISTS (
    SELECT 1 FROM inserted
  )
  INTO v_plan_created;

  SELECT *
  INTO v_plan
  FROM public.specialist_plan
  WHERE specialist_id = v_payment.specialist_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'plan_payment_specialist_plan_missing';
  END IF;

  IF v_plan_created THEN
    v_prior_expires := NULL;
  ELSE
    v_prior_expires := v_plan.expires_at;
  END IF;

  IF v_plan.expires_at IS NOT NULL AND v_plan.expires_at > v_paid_at THEN
    v_base := v_plan.expires_at;
  ELSE
    v_base := v_paid_at;
  END IF;

  v_new_expires := v_base + INTERVAL '1 month';
  v_grace := v_new_expires + INTERVAL '7 days';

  UPDATE public.specialist_plan
  SET
    plan_code = v_payment.plan_code,
    plan_status = 'active',
    started_at = COALESCE(v_plan.started_at, v_paid_at),
    expires_at = v_new_expires,
    grace_until = v_grace,
    updated_at = v_now
  WHERE specialist_id = v_payment.specialist_id;

  IF v_payment.promoted_credit_id IS NOT NULL THEN
    SELECT *
    INTO v_credit
    FROM public.promoted_request_subscription_credits
    WHERE id = v_payment.promoted_credit_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'plan_payment_credit_not_found';
    END IF;

    IF v_credit.specialist_id <> v_payment.specialist_id THEN
      RAISE EXCEPTION 'plan_payment_credit_specialist_mismatch';
    END IF;

    IF v_credit.consumed_at IS NOT NULL THEN
      IF v_credit.consumed_checkout_session_id IS DISTINCT FROM p_stripe_checkout_session_id THEN
        RAISE EXCEPTION 'plan_payment_credit_consumed_other_session';
      END IF;
    ELSE
      UPDATE public.promoted_request_subscription_credits
      SET
        consumed_at = v_paid_at,
        consumed_checkout_session_id = p_stripe_checkout_session_id,
        consumed_plan_code = v_payment.plan_code,
        updated_at = v_now
      WHERE id = v_payment.promoted_credit_id
        AND consumed_at IS NULL;

      IF NOT FOUND THEN
        SELECT *
        INTO v_credit
        FROM public.promoted_request_subscription_credits
        WHERE id = v_payment.promoted_credit_id;

        IF v_credit.consumed_checkout_session_id IS DISTINCT FROM p_stripe_checkout_session_id THEN
          RAISE EXCEPTION 'plan_payment_credit_consumed_other_session';
        END IF;
      END IF;

      v_credit_consumed := true;
    END IF;
  END IF;

  UPDATE public.plan_payments
  SET
    status = 'paid',
    paid_at = v_paid_at,
    stripe_payment_intent_id = COALESCE(v_payment.stripe_payment_intent_id, p_stripe_payment_intent_id),
    stripe_charge_id = COALESCE(v_payment.stripe_charge_id, p_stripe_charge_id),
    stripe_checkout_session_id = COALESCE(v_payment.stripe_checkout_session_id, p_stripe_checkout_session_id),
    entitlement_applied_at = v_now,
    prior_expires_at = v_prior_expires,
    period_end_at = v_new_expires,
    updated_at = v_now
  WHERE id = p_plan_payment_id;

  RETURN pg_catalog.jsonb_build_object(
    'outcome', 'applied',
    'plan_payment_id', v_payment.id,
    'specialist_id', v_payment.specialist_id,
    'prior_expires_at', v_prior_expires,
    'period_end_at', v_new_expires,
    'promoted_credit_consumed', v_credit_consumed OR v_payment.promoted_credit_id IS NOT NULL,
    'paid_at', v_paid_at
  );
END;
$$;

ALTER FUNCTION public.fulfill_plan_payment_entitlement(uuid, timestamptz, text, text, text)
  OWNER TO postgres;

REVOKE ALL ON FUNCTION public.fulfill_plan_payment_entitlement(uuid, timestamptz, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fulfill_plan_payment_entitlement(uuid, timestamptz, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_plan_payment_entitlement(uuid, timestamptz, text, text, text) TO service_role;

COMMIT;
