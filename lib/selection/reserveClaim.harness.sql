-- Manual concurrency and exclusivity harness for service-request reservation.
-- This file is not a migration and is not applied by CI.
-- Run it only against a disposable database AFTER
-- supabase/manual_migrations/2026-09-29_service_request_payment_authorization.sql.
-- Do not run it on production.
--
-- The script opens a transaction and rolls it back.
-- It needs two existing specialist rows. It inserts its own request and matches,
-- then proves the function and the partial unique indexes.
--
-- Two-session race, after two active matches exist for one unselected request:
--
-- Session A:
--   SELECT public.reserve_service_request_claim('<match-a>', '<specialist-a>', '<offer-a>');
-- Session B, overlapping Session A:
--   SELECT public.reserve_service_request_claim('<match-b>', '<specialist-b>', '<offer-b>');
--
-- Expected: one row with ok=true and changed=true.
-- The other returns ok=false and error=already_claimed.
-- Exactly one service_request_claims row with status reserved exists.
-- service_requests.selected_specialist_id stays null.
-- conversations stays empty for that request.
-- the other match stays active, not not_selected.

BEGIN;

DO $$
DECLARE
  spec_ids uuid[];
  spec_a uuid;
  spec_b uuid;
  req uuid;
  match_a uuid;
  match_b uuid;
  offer_a uuid;
  offer_b uuid;
  result jsonb;
  again jsonb;
  other jsonb;
  claim_id uuid;
  selected uuid;
  conversation_count integer;
  other_status text;
BEGIN
  IF to_regprocedure('public.reserve_service_request_claim(uuid,uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Apply 2026-09-29_service_request_payment_authorization.sql before this harness';
  END IF;
  IF to_regprocedure('public.reserve_service_request_claim(uuid,uuid)') IS NOT NULL THEN
    RAISE EXCEPTION 'obsolete two-argument reservation function is still present';
  END IF;

  SELECT array_agg(id) INTO spec_ids
  FROM (SELECT id FROM public.specialists LIMIT 2) picked;
  IF spec_ids IS NULL OR array_length(spec_ids, 1) < 2 THEN
    RAISE EXCEPTION 'Disposable database needs two specialists before this harness';
  END IF;
  spec_a := spec_ids[1];
  spec_b := spec_ids[2];

  INSERT INTO public.service_requests (
    public_id, client_name, client_email, description, urgency, locale, status
  ) VALUES (
    'REQ-HARNESS-CLAIM-' || gen_random_uuid()::text,
    'Harness',
    'harness@example.test',
    'Reservation harness',
    'flexible',
    'de',
    'new'
  )
  RETURNING id INTO req;

  INSERT INTO public.service_request_matches (service_request_id, specialist_id, status)
  VALUES (req, spec_a, 'active')
  RETURNING id INTO match_a;

  INSERT INTO public.service_request_matches (service_request_id, specialist_id, status)
  VALUES (req, spec_b, 'active')
  RETURNING id INTO match_b;

  INSERT INTO public.request_offers (
    request_kind, lead_id, service_request_id, promotion_id, specialist_id,
    offer_reason, pricing_segment, billing_model, price_cents, currency, status, idempotency_key
  ) VALUES (
    'service_request', NULL, req, NULL, spec_a,
    'matched', 'consumer', 'pay_per_lead', NULL, 'eur', 'offered',
    'service-request:' || req::text || ':specialist:' || spec_a::text || ':matched:initial'
  )
  RETURNING id INTO offer_a;

  INSERT INTO public.request_offers (
    request_kind, lead_id, service_request_id, promotion_id, specialist_id,
    offer_reason, pricing_segment, billing_model, price_cents, currency, status, idempotency_key
  ) VALUES (
    'service_request', NULL, req, NULL, spec_b,
    'matched', 'consumer', 'pay_per_lead', NULL, 'eur', 'offered',
    'service-request:' || req::text || ':specialist:' || spec_b::text || ':matched:initial'
  )
  RETURNING id INTO offer_b;

  result := public.reserve_service_request_claim(match_a, spec_a, offer_a);
  IF result->>'ok' <> 'true' OR result->>'changed' <> 'true' THEN
    RAISE EXCEPTION 'first reserve failed: %', result;
  END IF;
  claim_id := (result->>'claim_id')::uuid;
  IF (SELECT request_offer_id FROM public.service_request_claims WHERE id = claim_id) IS DISTINCT FROM offer_a THEN
    RAISE EXCEPTION 'reservation did not bind the matched offer';
  END IF;

  again := public.reserve_service_request_claim(match_a, spec_a, offer_a);
  IF again->>'ok' <> 'true' OR again->>'changed' <> 'false' OR (again->>'claim_id')::uuid <> claim_id THEN
    RAISE EXCEPTION 'idempotent retry failed: %', again;
  END IF;

  IF public.reserve_service_request_claim(match_a, spec_a, offer_b)->>'error' <> 'offer_unavailable' THEN
    RAISE EXCEPTION 'a different offer was accepted for the same reservation';
  END IF;
  IF public.reserve_service_request_claim(match_a, spec_a, NULL)->>'error' <> 'offer_unavailable' THEN
    RAISE EXCEPTION 'a null offer was accepted for the same reservation';
  END IF;

  other := public.reserve_service_request_claim(match_b, spec_b, offer_b);
  IF other->>'error' <> 'already_claimed' THEN
    RAISE EXCEPTION 'second specialist was not blocked: %', other;
  END IF;

  SELECT selected_specialist_id INTO selected FROM public.service_requests WHERE id = req;
  IF selected IS NOT NULL THEN
    RAISE EXCEPTION 'reservation set selected_specialist_id';
  END IF;

  SELECT count(*) INTO conversation_count FROM public.conversations WHERE service_request_id = req;
  IF conversation_count <> 0 THEN
    RAISE EXCEPTION 'reservation created a conversation';
  END IF;

  SELECT status INTO other_status FROM public.service_request_matches WHERE id = match_b;
  IF other_status <> 'active' THEN
    RAISE EXCEPTION 'reservation changed the other match to %', other_status;
  END IF;

  IF public.reserve_service_request_claim(match_a, spec_b, offer_a)->>'error' <> 'forbidden' THEN
    RAISE EXCEPTION 'foreign specialist was not forbidden';
  END IF;

  UPDATE public.service_request_claims
  SET status = 'released', released_at = now(), updated_at = now()
  WHERE id = claim_id;

  UPDATE public.service_request_matches SET status = 'declined', updated_at = now() WHERE id = match_b;
  IF public.reserve_service_request_claim(match_b, spec_b, offer_b)->>'error' <> 'not_claimable' THEN
    RAISE EXCEPTION 'declined match was claimable';
  END IF;
  UPDATE public.service_request_matches SET status = 'active', updated_at = now() WHERE id = match_b;

  result := public.reserve_service_request_claim(match_b, spec_b, offer_b);
  IF result->>'ok' <> 'true' OR result->>'changed' <> 'true' THEN
    RAISE EXCEPTION 'released claim still blocked a later claim: %', result;
  END IF;
  claim_id := (result->>'claim_id')::uuid;

  UPDATE public.service_request_claims
  SET status = 'expired', expired_at = now(), released_at = NULL, updated_at = now()
  WHERE id = claim_id;
  result := public.reserve_service_request_claim(match_a, spec_a, offer_a);
  IF result->>'ok' <> 'true' THEN
    RAISE EXCEPTION 'expired claim still blocked a later claim: %', result;
  END IF;
  claim_id := (result->>'claim_id')::uuid;

  UPDATE public.service_request_claims
  SET status = 'failed',
      failed_at = now(),
      expired_at = NULL,
      released_at = NULL,
      completed_at = NULL,
      updated_at = now()
  WHERE id = claim_id;
  result := public.reserve_service_request_claim(match_b, spec_b, offer_b);
  IF result->>'ok' <> 'true' THEN
    RAISE EXCEPTION 'failed claim still blocked a later claim: %', result;
  END IF;
  claim_id := (result->>'claim_id')::uuid;

  UPDATE public.service_request_claims
  SET status = 'completed',
      completed_at = now(),
      failed_at = NULL,
      expired_at = NULL,
      released_at = NULL,
      updated_at = now()
  WHERE id = claim_id;
  IF public.reserve_service_request_claim(match_a, spec_a, offer_a)->>'error' <> 'already_claimed' THEN
    RAISE EXCEPTION 'completed claim did not permanently block';
  END IF;

  UPDATE public.service_request_claims
  SET status = 'released', released_at = now(), completed_at = NULL, updated_at = now()
  WHERE id = claim_id;
  UPDATE public.service_requests
  SET selected_specialist_id = spec_a, selected_at = now(), status = 'matched', updated_at = now()
  WHERE id = req;
  IF public.reserve_service_request_claim(match_a, spec_a, offer_a)->>'error' <> 'already_claimed' THEN
    RAISE EXCEPTION 'selected request was still reservable';
  END IF;
END $$;

ROLLBACK;
