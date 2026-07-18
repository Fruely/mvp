-- Freuly geography: search_specialists_local_radius v2 (DUAL RADIUS)
-- MANUAL migration — DO NOT apply to staging/production without approval.
--
-- BEFORE applying:
-- 1) Run 2026-07-18_geo_rpc_baseline_diagnostics.sql and archive pg_get_functiondef.
-- 2) Confirm grants / security_definer / search_path from baseline.
--
-- Baseline observation (2026-07-18, PostgREST probes; full DDL unavailable without direct Postgres access):
--   args: p_ref_lat, p_ref_lng, p_radius_km (required);
--         p_lang, p_category_id, p_mode, p_offset, p_limit (optional)
--   returns: id, name, category_id, languages, work_format, postal_code, lat, lng,
--            distance, rating, is_pro
--   p_mode=null returned online+offline (online polluted local).
--
-- v2 rules:
--   local rows: work_format IN ('offline','hybrid')
--   distance <= p_radius_km
--   AND distance <= specialists.service_radius_km
--   service_radius_km must be in (5,10,25,50,100)
--   only public visible specialists
--   pure online excluded from this RPC (use separate online query)
--
-- Distance: Haversine via earth-like formula (no PostGIS requirement).
-- Replace body with PostGIS ST_DWithin if production baseline uses PostGIS.

BEGIN;

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
  category_id uuid,
  languages text[],
  work_format text,
  postal_code text,
  lat double precision,
  lng double precision,
  distance double precision,
  rating numeric,
  is_pro boolean,
  service_radius_km integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      p_ref_lat AS ref_lat,
      p_ref_lng AS ref_lng,
      GREATEST(p_radius_km, 0)::double precision AS user_radius_km,
      GREATEST(COALESCE(p_offset, 0), 0) AS off,
      LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100) AS lim
  ),
  scored AS (
    SELECT
      s.id,
      s.name,
      s.category_id,
      s.languages,
      s.work_format,
      s.postal_code,
      s.lat,
      s.lng,
      (
        6371 * 2 * ASIN(
          SQRT(
            POWER(SIN(RADIANS((s.lat - p.ref_lat) / 2)), 2) +
            COS(RADIANS(p.ref_lat)) * COS(RADIANS(s.lat)) *
            POWER(SIN(RADIANS((s.lng - p.ref_lng) / 2)), 2)
          )
        )
      ) AS distance,
      NULL::numeric AS rating,
      COALESCE(s.is_featured, false) AS is_pro,
      s.service_radius_km
    FROM public.specialists s
    CROSS JOIN params p
    WHERE s.is_active IS TRUE
      AND s.is_visible IS TRUE
      AND s.status IN ('published_unverified', 'featured_verified', 'approved')
      AND (s.is_test IS NULL OR s.is_test IS FALSE)
      AND s.lat IS NOT NULL
      AND s.lng IS NOT NULL
      AND NOT (s.lat = 0 AND s.lng = 0)
      AND s.work_format IN ('offline', 'hybrid')
      AND s.service_radius_km IN (5, 10, 25, 50, 100)
      AND (p_category_id IS NULL OR s.category_id = p_category_id)
      AND (
        p_lang IS NULL
        OR s.languages @> ARRAY[p_lang]::text[]
      )
  )
  SELECT
    sc.id,
    sc.name,
    sc.category_id,
    sc.languages,
    sc.work_format,
    sc.postal_code,
    sc.lat,
    sc.lng,
    sc.distance,
    sc.rating,
    sc.is_pro,
    sc.service_radius_km
  FROM scored sc
  CROSS JOIN params p
  WHERE sc.distance <= p.user_radius_km
    AND sc.distance <= sc.service_radius_km::double precision
  ORDER BY sc.distance ASC, sc.id ASC
  OFFSET (SELECT off FROM params)
  LIMIT (SELECT lim FROM params);
$$;

-- Grants: align with baseline after diagnostics. Typical PostgREST:
GRANT EXECUTE ON FUNCTION public.search_specialists_local_radius(
  double precision, double precision, double precision, text, uuid, text, integer, integer
) TO anon, authenticated, service_role;

COMMIT;
