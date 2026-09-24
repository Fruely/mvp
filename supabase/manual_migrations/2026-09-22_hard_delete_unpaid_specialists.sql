-- Extend the existing admin-only deletion RPC to remove uncompleted commercial
-- attempts and untouched offers. Completed/refunded payments, commissions and
-- any active or interacted offers remain protected by RESTRICT foreign keys.
-- Apply this before deploying the updated admin_delete_specialist Edge Function.
BEGIN;

CREATE OR REPLACE FUNCTION public.admin_delete_specialist_tx(p_specialist_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_email text;
  v_user_id uuid;
  v_deleted_apps integer := 0;
  v_deleted_specialists integer := 0;
  v_deleted_checkout_attempts integer := 0;
  v_deleted_untouched_offers integer := 0;
BEGIN
  SELECT s.email, s.user_id INTO v_email, v_user_id
  FROM public.specialists s
  WHERE s.id = p_specialist_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SPECIALIST_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.plan_payments p
    WHERE p.specialist_id = p_specialist_id
      AND NOT (
        p.status IN ('failed', 'expired')
        AND p.paid_at IS NULL
        AND p.stripe_payment_intent_id IS NULL
        AND p.stripe_charge_id IS NULL
        AND p.entitlement_applied_at IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'DELETE_BLOCKED_BY_PAYMENT_HISTORY' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.request_offers o
    WHERE o.specialist_id = p_specialist_id
      AND (o.status <> 'offered' OR o.viewed_at IS NOT NULL
        OR o.accepted_at IS NOT NULL OR o.paid_at IS NOT NULL
        OR o.contacted_at IS NOT NULL OR o.outcome_at IS NOT NULL)
  ) OR EXISTS (
    SELECT 1 FROM public.request_offer_payments p
    WHERE p.specialist_id = p_specialist_id
  ) OR EXISTS (
    SELECT 1 FROM public.request_offer_access_grants g
    WHERE g.specialist_id = p_specialist_id
  ) THEN
    RAISE EXCEPTION 'DELETE_BLOCKED_BY_OFFER_HISTORY' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.partner_commissions c
    WHERE c.specialist_id = p_specialist_id
  ) THEN
    RAISE EXCEPTION 'DELETE_BLOCKED_BY_COMMISSION_HISTORY' USING ERRCODE = 'P0001';
  END IF;

  -- The specialist row lock prevents a concurrent FK insert while these rows
  -- are checked and removed. The entire RPC rolls back if another FK blocks it.
  DELETE FROM public.plan_payments p
  WHERE p.specialist_id = p_specialist_id;
  GET DIAGNOSTICS v_deleted_checkout_attempts = ROW_COUNT;

  DELETE FROM public.request_offers o
  WHERE o.specialist_id = p_specialist_id;
  GET DIAGNOSTICS v_deleted_untouched_offers = ROW_COUNT;

  DELETE FROM public.partner_attributions a
  WHERE a.specialist_id = p_specialist_id;

  IF v_email IS NOT NULL AND btrim(v_email) <> '' THEN
    DELETE FROM public.specialist_applications a
    WHERE lower(btrim(a.email)) = lower(btrim(v_email));
    GET DIAGNOSTICS v_deleted_apps = ROW_COUNT;
  END IF;

  DELETE FROM public.specialists s WHERE s.id = p_specialist_id;
  GET DIAGNOSTICS v_deleted_specialists = ROW_COUNT;
  IF v_deleted_specialists <> 1 THEN
    RAISE EXCEPTION 'SPECIALIST_DELETE_FAILED' USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'specialist_id', p_specialist_id,
    'user_id', v_user_id,
    'deleted_specialist_applications', v_deleted_apps,
    'deleted_specialists', v_deleted_specialists,
    'deleted_expired_checkout_attempts', v_deleted_checkout_attempts,
    'deleted_untouched_offers', v_deleted_untouched_offers
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_delete_specialist_tx(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_specialist_tx(uuid) TO service_role;

COMMIT;
