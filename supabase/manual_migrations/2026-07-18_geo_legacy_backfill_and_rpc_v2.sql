-- =============================================================================
-- MANUAL one-shot geo rollout (Option 2 complete → RPC v2)
-- Run once in Supabase SQL Editor (single Run).
-- Agent must NOT execute this against production.
-- =============================================================================
-- Contents (one transaction, then post-COMMIT read-only probes):
--   A) Guard: exactly 16 target offline/hybrid active+visible rows with
--      service_radius_km IN (NULL, 30, 200, 1000)
--   B) Radius mapping (only those values):
--        NULL → 25 | 30 → 25 | 200 → 100 | 1000 → 100
--   C) City backfill by PLZ (only empty specialist_profiles.city)
--   D) Petro Dolhov coords (PLZ 41460) from app Nominatim resolver evidence
--   E) Assertions: 16 IDs geo-clean
--   F) Embed search_specialists_local_radius v2 (unchanged contract)
--   G) In-tx metadata assertions
--   COMMIT
--   H) Post-COMMIT behavioral SELECT probes
--
-- Does NOT modify public.distance_km.
-- Does NOT unpublish specialists.
-- =============================================================================
-- City evidence (Nominatim postalcode search, same URL shape as
-- lib/specialists/resolvePostalLocation.ts geocodeGermanPlzViaNominatim):
--   15732 → Schulzendorf
--   53115 → Bonn
--   10711 → Berlin
--   48159 → Münster
--   28359 → Bremen
--   65597 → Nominatim primary extractCity = Kirberg (village);
--           municipality in display_name = Hünfelden (owner mapping).
-- Petro 41460 Neuss coords (Nominatim 2026-07-18):
--   lat=51.2071566 lng=6.7068177 (DE bbox OK)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- A) Target set + pre-update guard
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  target_ids uuid[] := ARRAY[
    'e01b8948-a960-4d86-add5-e30f99955932'::uuid,
    'a08ffb9d-6a6b-410c-998a-e6f187a6d96a'::uuid,
    '2d04c085-6b2c-4c4d-9bf2-330e657b369b'::uuid,
    'f5529219-b3ea-48b0-b1c0-bccd33b553e8'::uuid,
    '343d3741-c2f0-45ad-878c-6af69ad9b75a'::uuid,
    '83fd4db4-2860-4c34-9200-741421859f9a'::uuid,
    'bcba5e20-7ed1-42d5-8dda-71e4c4b734bf'::uuid,
    '3c2965d8-3d8b-4055-9a03-b37dfc65f785'::uuid,
    'c5060008-cb03-4b6c-a8a1-f515fa5f7090'::uuid,
    '35b072b4-5afa-41e7-aa1a-490862ee64e7'::uuid,
    '0436e916-3d03-426a-990a-35ec24549299'::uuid,
    '2e142638-cef0-4807-a2f8-03e03a9a5489'::uuid,
    'b867bcb1-812a-4004-aed4-48debd5ce4f2'::uuid,
    'bc71b33e-23f5-4f2c-a133-e66fd872c714'::uuid,
    'b2109266-083f-4be5-8ddf-bbdf9168eb9a'::uuid,
    '948daea8-a6e5-4a36-a234-9feed4784a4e'::uuid
  ];
  n int;
BEGIN
  SELECT count(*) INTO n
  FROM public.specialists s
  WHERE s.id = ANY (target_ids)
    AND s.work_format IN ('offline', 'hybrid')
    AND s.is_active IS TRUE
    AND s.is_visible IS TRUE
    AND (
      s.service_radius_km IS NULL
      OR s.service_radius_km IN (30, 200, 1000)
    );

  IF n <> 16 THEN
    RAISE EXCEPTION
      'legacy radius backfill guard failed: expected 16 matching rows (offline/hybrid active visible with NULL|30|200|1000), found %',
      n;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- B) Radius mapping (allowlisted values untouched)
-- ---------------------------------------------------------------------------
UPDATE public.specialists s
SET service_radius_km = CASE
  WHEN s.service_radius_km IS NULL THEN 25
  WHEN s.service_radius_km = 30 THEN 25
  WHEN s.service_radius_km = 200 THEN 100
  WHEN s.service_radius_km = 1000 THEN 100
  ELSE s.service_radius_km
END
WHERE s.id IN (
    'e01b8948-a960-4d86-add5-e30f99955932',
    'a08ffb9d-6a6b-410c-998a-e6f187a6d96a',
    '2d04c085-6b2c-4c4d-9bf2-330e657b369b',
    'f5529219-b3ea-48b0-b1c0-bccd33b553e8',
    '343d3741-c2f0-45ad-878c-6af69ad9b75a',
    '83fd4db4-2860-4c34-9200-741421859f9a',
    'bcba5e20-7ed1-42d5-8dda-71e4c4b734bf',
    '3c2965d8-3d8b-4055-9a03-b37dfc65f785',
    'c5060008-cb03-4b6c-a8a1-f515fa5f7090',
    '35b072b4-5afa-41e7-aa1a-490862ee64e7',
    '0436e916-3d03-426a-990a-35ec24549299',
    '2e142638-cef0-4807-a2f8-03e03a9a5489',
    'b867bcb1-812a-4004-aed4-48debd5ce4f2',
    'bc71b33e-23f5-4f2c-a133-e66fd872c714',
    'b2109266-083f-4be5-8ddf-bbdf9168eb9a',
    '948daea8-a6e5-4a36-a234-9feed4784a4e'
  )
  AND s.work_format IN ('offline', 'hybrid')
  AND s.is_active IS TRUE
  AND s.is_visible IS TRUE
  AND (
    s.service_radius_km IS NULL
    OR s.service_radius_km IN (30, 200, 1000)
  );

-- ---------------------------------------------------------------------------
-- C) City backfill (empty city only). Conflict key: specialist_id
--    (matches app upsert onConflict: "specialist_id")
-- ---------------------------------------------------------------------------
INSERT INTO public.specialist_profiles (specialist_id, city)
SELECT s.id, m.city
FROM public.specialists s
INNER JOIN (
  VALUES
    ('15732', 'Schulzendorf'),
    ('65597', 'Hünfelden'),
    ('53115', 'Bonn'),
    ('10711', 'Berlin'),
    ('48159', 'Münster'),
    ('28359', 'Bremen'),
    ('41460', 'Neuss')
) AS m(plz, city) ON s.postal_code = m.plz
WHERE s.id IN (
    'e01b8948-a960-4d86-add5-e30f99955932',
    'a08ffb9d-6a6b-410c-998a-e6f187a6d96a',
    '2d04c085-6b2c-4c4d-9bf2-330e657b369b',
    'f5529219-b3ea-48b0-b1c0-bccd33b553e8',
    '343d3741-c2f0-45ad-878c-6af69ad9b75a',
    '83fd4db4-2860-4c34-9200-741421859f9a',
    'bcba5e20-7ed1-42d5-8dda-71e4c4b734bf',
    '3c2965d8-3d8b-4055-9a03-b37dfc65f785',
    'c5060008-cb03-4b6c-a8a1-f515fa5f7090',
    '35b072b4-5afa-41e7-aa1a-490862ee64e7',
    '0436e916-3d03-426a-990a-35ec24549299',
    '2e142638-cef0-4807-a2f8-03e03a9a5489',
    'b867bcb1-812a-4004-aed4-48debd5ce4f2',
    'bc71b33e-23f5-4f2c-a133-e66fd872c714',
    'b2109266-083f-4be5-8ddf-bbdf9168eb9a',
    '948daea8-a6e5-4a36-a234-9feed4784a4e'
  )
  AND s.work_format IN ('offline', 'hybrid')
  AND s.is_active IS TRUE
  AND s.is_visible IS TRUE
ON CONFLICT (specialist_id) DO UPDATE
SET city = EXCLUDED.city
WHERE public.specialist_profiles.city IS NULL
   OR btrim(public.specialist_profiles.city) = '';

-- ---------------------------------------------------------------------------
-- D) Petro Dolhov coordinates (resolver evidence; only if missing/zero)
-- ---------------------------------------------------------------------------
UPDATE public.specialists s
SET
  lat = 51.2071566,
  lng = 6.7068177,
  country_code = 'DE'
WHERE s.id = '2d04c085-6b2c-4c4d-9bf2-330e657b369b'
  AND s.postal_code = '41460'
  AND s.work_format IN ('offline', 'hybrid')
  AND s.is_active IS TRUE
  AND s.is_visible IS TRUE
  AND (
    s.lat IS NULL
    OR s.lng IS NULL
    OR (s.lat = 0 AND s.lng = 0)
  );

-- ---------------------------------------------------------------------------
-- E) Post-backfill assertions for the 16 IDs
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  target_ids uuid[] := ARRAY[
    'e01b8948-a960-4d86-add5-e30f99955932'::uuid,
    'a08ffb9d-6a6b-410c-998a-e6f187a6d96a'::uuid,
    '2d04c085-6b2c-4c4d-9bf2-330e657b369b'::uuid,
    'f5529219-b3ea-48b0-b1c0-bccd33b553e8'::uuid,
    '343d3741-c2f0-45ad-878c-6af69ad9b75a'::uuid,
    '83fd4db4-2860-4c34-9200-741421859f9a'::uuid,
    'bcba5e20-7ed1-42d5-8dda-71e4c4b734bf'::uuid,
    '3c2965d8-3d8b-4055-9a03-b37dfc65f785'::uuid,
    'c5060008-cb03-4b6c-a8a1-f515fa5f7090'::uuid,
    '35b072b4-5afa-41e7-aa1a-490862ee64e7'::uuid,
    '0436e916-3d03-426a-990a-35ec24549299'::uuid,
    '2e142638-cef0-4807-a2f8-03e03a9a5489'::uuid,
    'b867bcb1-812a-4004-aed4-48debd5ce4f2'::uuid,
    'bc71b33e-23f5-4f2c-a133-e66fd872c714'::uuid,
    'b2109266-083f-4be5-8ddf-bbdf9168eb9a'::uuid,
    '948daea8-a6e5-4a36-a234-9feed4784a4e'::uuid
  ];
  bad int;
BEGIN
  SELECT count(*) INTO bad
  FROM public.specialists s
  LEFT JOIN public.specialist_profiles p ON p.specialist_id = s.id
  WHERE s.id = ANY (target_ids)
    AND (
      s.work_format NOT IN ('offline', 'hybrid')
      OR s.is_active IS DISTINCT FROM TRUE
      OR s.is_visible IS DISTINCT FROM TRUE
      OR s.service_radius_km IS NULL
      OR s.service_radius_km NOT IN (5, 10, 25, 50, 100)
      OR p.city IS NULL
      OR btrim(p.city) = ''
      OR s.lat IS NULL
      OR s.lng IS NULL
      OR (s.lat = 0 AND s.lng = 0)
      OR s.lat < -90 OR s.lat > 90
      OR s.lng < -180 OR s.lng > 180
      OR s.country_code IS NULL
      OR upper(btrim(s.country_code)) <> 'DE'
      OR s.postal_code IS NULL
      OR s.postal_code !~ '^\d{5}$'
    );

  IF bad <> 0 THEN
    RAISE EXCEPTION
      'post-backfill assertion failed: % of 16 target specialists still fail geo invariant',
      bad;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- F) RPC v2 (exact body from 2026-07-18_search_specialists_local_radius_v2.sql;
--    no nested BEGIN/COMMIT; distance_km untouched)
-- ---------------------------------------------------------------------------
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

  -- Safe empty for online / unknown modes (no exception → no PostgREST 500).
  -- Comparisons are case-sensitive: 'Online' / 'LOCAL' are unknown → empty.
  IF p_mode IS NOT NULL AND p_mode NOT IN ('offline', 'hybrid', 'local') THEN
    RETURN;
  END IF;

  -- Invalid reference point → empty (do not call distance_km with bad inputs).
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
    AND d.dist = d.dist -- exclude NaN (NaN is not equal to itself)
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

COMMENT ON FUNCTION public.search_specialists_local_radius(
  double precision, double precision, double precision, text, uuid, text, integer, integer
) IS
'v2 dual-radius local search (2026-07-18). Baseline: 2026-07-18_prod_search_local_radius+distance_km. Projection: s.is_pro, s.rating (production). Offline/hybrid only; dual radius allowlist; online → empty. Uses public.distance_km unchanged. SECURITY INVOKER. Rollback: supabase/manual-rollbacks/2026-07-18_geo_legacy_backfill_and_rpc_v2.sql';

-- ---------------------------------------------------------------------------
-- G) In-transaction RPC metadata assertions
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  def text;
  owner_name text;
  is_definer boolean;
  online_n bigint;
  null_mode_online_n bigint;
BEGIN
  SELECT
    pg_get_functiondef(p.oid),
    pg_get_userbyid(p.proowner),
    p.prosecdef
  INTO def, owner_name, is_definer
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'search_specialists_local_radius';

  IF def IS NULL THEN
    RAISE EXCEPTION 'RPC v2 missing after CREATE OR REPLACE';
  END IF;
  IF owner_name IS DISTINCT FROM 'postgres' THEN
    RAISE EXCEPTION 'RPC owner is %, expected postgres', owner_name;
  END IF;
  IF is_definer IS TRUE THEN
    RAISE EXCEPTION 'RPC is SECURITY DEFINER; expected INVOKER';
  END IF;
  IF position('s.is_pro' in def) = 0 OR position('s.rating' in def) = 0 THEN
    RAISE EXCEPTION 'RPC projection missing s.is_pro / s.rating';
  END IF;
  IF position('is_featured' in def) > 0 OR position('specialist_rating_stats' in def) > 0 THEN
    RAISE EXCEPTION 'RPC unexpectedly remaps is_pro/rating';
  END IF;
  IF position('service_radius_km IN (5, 10, 25, 50, 100)' in def) = 0 THEN
    RAISE EXCEPTION 'RPC missing dual-radius allowlist filter';
  END IF;

  SELECT count(*) INTO online_n
  FROM public.search_specialists_local_radius(
    50.7374, 7.0982, 100, NULL, NULL, 'online', 0, 50
  );
  IF online_n <> 0 THEN
    RAISE EXCEPTION 'p_mode=online returned % rows; expected 0', online_n;
  END IF;

  SELECT count(*) INTO null_mode_online_n
  FROM public.search_specialists_local_radius(
    50.7374, 7.0982, 100, NULL, NULL, NULL, 0, 100
  ) r
  WHERE r.work_format = 'online';
  IF null_mode_online_n <> 0 THEN
    RAISE EXCEPTION 'p_mode=null returned % online rows; expected 0', null_mode_online_n;
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- H) Post-COMMIT read-only verification (single result set for SQL Editor)
-- =============================================================================
WITH target AS (
  SELECT unnest(ARRAY[
    'e01b8948-a960-4d86-add5-e30f99955932'::uuid,
    'a08ffb9d-6a6b-410c-998a-e6f187a6d96a'::uuid,
    '2d04c085-6b2c-4c4d-9bf2-330e657b369b'::uuid,
    'f5529219-b3ea-48b0-b1c0-bccd33b553e8'::uuid,
    '343d3741-c2f0-45ad-878c-6af69ad9b75a'::uuid,
    '83fd4db4-2860-4c34-9200-741421859f9a'::uuid,
    'bcba5e20-7ed1-42d5-8dda-71e4c4b734bf'::uuid,
    '3c2965d8-3d8b-4055-9a03-b37dfc65f785'::uuid,
    'c5060008-cb03-4b6c-a8a1-f515fa5f7090'::uuid,
    '35b072b4-5afa-41e7-aa1a-490862ee64e7'::uuid,
    '0436e916-3d03-426a-990a-35ec24549299'::uuid,
    '2e142638-cef0-4807-a2f8-03e03a9a5489'::uuid,
    'b867bcb1-812a-4004-aed4-48debd5ce4f2'::uuid,
    'bc71b33e-23f5-4f2c-a133-e66fd872c714'::uuid,
    'b2109266-083f-4be5-8ddf-bbdf9168eb9a'::uuid,
    '948daea8-a6e5-4a36-a234-9feed4784a4e'::uuid
  ]) AS id
),
legacy_geo AS (
  SELECT
    count(*) FILTER (
      WHERE s.service_radius_km IS NULL
         OR s.service_radius_km NOT IN (5, 10, 25, 50, 100)
         OR p.city IS NULL OR btrim(p.city) = ''
         OR s.lat IS NULL OR s.lng IS NULL
         OR (s.lat = 0 AND s.lng = 0)
         OR upper(btrim(coalesce(s.country_code, ''))) <> 'DE'
         OR s.postal_code IS NULL OR s.postal_code !~ '^\d{5}$'
    ) AS still_affected
  FROM target t
  JOIN public.specialists s ON s.id = t.id
  LEFT JOIN public.specialist_profiles p ON p.specialist_id = s.id
),
rpc_meta AS (
  SELECT
    pg_get_userbyid(p.proowner) AS owner,
    p.prosecdef AS security_definer,
    (pg_get_functiondef(p.oid) LIKE '%service_radius_km IN (5, 10, 25, 50, 100)%') AS has_allowlist,
    (pg_get_functiondef(p.oid) LIKE '%s.is_pro%') AS has_s_is_pro
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'search_specialists_local_radius'
),
rpc_probe AS (
  SELECT
    (SELECT count(*) FROM public.search_specialists_local_radius(
      50.7374, 7.0982, 100, NULL, NULL, 'online', 0, 50
    )) AS online_mode_n,
    (SELECT count(*) FROM public.search_specialists_local_radius(
      50.7374, 7.0982, 100, NULL, NULL, NULL, 0, 100
    ) r WHERE r.work_format = 'online') AS null_mode_online_n,
    (SELECT count(*) FROM public.search_specialists_local_radius(
      50.7374, 7.0982, 100, NULL, NULL, 'hybrid', 0, 50
    )) AS hybrid_mode_n,
    (SELECT bool_and(h.distance <= s.service_radius_km::float8)
     FROM public.search_specialists_local_radius(
       50.7374, 7.0982, 100, NULL, NULL, NULL, 0, 100
     ) h
     JOIN public.specialists s ON s.id = h.id) AS dual_radius_ok
)
SELECT
  'rollout_verify'::text AS row_type,
  lg.still_affected,
  rm.owner,
  rm.security_definer,
  rm.has_allowlist,
  rm.has_s_is_pro,
  rp.online_mode_n,
  rp.null_mode_online_n,
  rp.hybrid_mode_n,
  rp.dual_radius_ok,
  (lg.still_affected = 0
    AND rm.owner = 'postgres'
    AND rm.security_definer IS FALSE
    AND rm.has_allowlist
    AND rm.has_s_is_pro
    AND rp.online_mode_n = 0
    AND rp.null_mode_online_n = 0
    AND rp.dual_radius_ok IS DISTINCT FROM FALSE) AS ok
FROM legacy_geo lg
CROSS JOIN rpc_meta rm
CROSS JOIN rpc_probe rp;
