-- =============================================================================
-- READ ONLY. SELECT / CTE only.
-- Option 2 legacy remediation report for RPC v2 gate.
-- Safe for Supabase SQL Editor. No DDL/DML. No temp tables. No functions.
-- Does not assign radius, hide profiles, or apply RPC v2.
-- =============================================================================
-- Published-like invariant (matches geo audit / project production filter):
--   status IN ('published_unverified', 'featured_verified', 'approved', 'paused')
--   AND is_active IS TRUE
--   AND is_visible IS TRUE
-- Scope: work_format IN ('offline', 'hybrid') with at least one geo problem.
--
-- Single result set (Supabase SQL Editor shows one grid):
--   row_type = 'profile' → specialist rows
--   row_type = 'summary' → one aggregate row at the end
-- =============================================================================

WITH published_local AS (
  SELECT
    s.id,
    s.name,
    s.slug,
    s.category_id,
    s.work_format,
    s.mobile_service,
    s.postal_code,
    p.city AS profile_city,
    s.country_code,
    s.lat,
    s.lng,
    s.service_radius_km,
    s.status,
    -- Not used in-repo; placeholder so the report shape stays stable.
    NULL::text AS profile_status,
    s.is_active,
    s.is_visible,
    s.published_at,
    s.created_at,
    s.updated_at
  FROM public.specialists s
  LEFT JOIN public.specialist_profiles p ON p.specialist_id = s.id
  WHERE s.status IN ('published_unverified', 'featured_verified', 'approved', 'paused')
    AND s.is_active IS TRUE
    AND s.is_visible IS TRUE
    AND s.work_format IN ('offline', 'hybrid')
),
flagged AS (
  SELECT
    pl.*,
    ARRAY_REMOVE(
      ARRAY[
        CASE WHEN pl.service_radius_km IS NULL THEN 'missing_radius' END,
        CASE
          WHEN pl.service_radius_km IS NOT NULL
           AND pl.service_radius_km NOT IN (5, 10, 25, 50, 100)
          THEN 'invalid_radius'
        END,
        CASE
          WHEN pl.postal_code IS NULL
            OR btrim(pl.postal_code) = ''
            OR pl.postal_code !~ '^\d{5}$'
          THEN 'missing_postal_code'
        END,
        CASE
          WHEN pl.profile_city IS NULL OR btrim(pl.profile_city) = ''
          THEN 'missing_city'
        END,
        CASE
          WHEN pl.lat IS NULL OR pl.lng IS NULL
          THEN 'missing_coordinates'
        END,
        CASE
          WHEN pl.lat = 0 AND pl.lng = 0
          THEN 'zero_coordinates'
        END,
        CASE
          WHEN pl.country_code IS NULL OR btrim(pl.country_code) = ''
          THEN 'missing_country'
        END,
        CASE
          WHEN pl.country_code IS NOT NULL
           AND btrim(pl.country_code) <> ''
           AND upper(btrim(pl.country_code)) <> 'DE'
          THEN 'unsupported_country'
        END
      ]::text[],
      NULL
    ) AS remediation_reasons
  FROM published_local pl
),
affected AS (
  SELECT
    f.*,
    cardinality(f.remediation_reasons) AS problem_count
  FROM flagged f
  WHERE cardinality(f.remediation_reasons) > 0
),
profile_rows AS (
  SELECT
    'profile'::text AS row_type,
    a.id,
    a.name,
    a.slug,
    a.category_id,
    a.work_format,
    a.mobile_service,
    a.postal_code,
    a.profile_city AS city,
    a.country_code,
    a.lat,
    a.lng,
    a.service_radius_km,
    a.status,
    a.profile_status,
    a.is_active,
    a.is_visible,
    a.published_at,
    a.created_at,
    a.updated_at,
    array_to_string(a.remediation_reasons, ',') AS remediation_reasons,
    a.problem_count,
    NULL::bigint AS total_affected,
    NULL::bigint AS missing_radius,
    NULL::bigint AS invalid_radius,
    NULL::bigint AS missing_postal_code,
    NULL::bigint AS missing_city,
    NULL::bigint AS missing_coordinates,
    NULL::bigint AS zero_coordinates,
    NULL::bigint AS missing_country,
    NULL::bigint AS unsupported_country
  FROM affected a
),
summary_row AS (
  SELECT
    'summary'::text AS row_type,
    NULL::uuid AS id,
    NULL::text AS name,
    NULL::text AS slug,
    NULL::uuid AS category_id,
    NULL::text AS work_format,
    NULL::boolean AS mobile_service,
    NULL::text AS postal_code,
    NULL::text AS city,
    NULL::text AS country_code,
    NULL::double precision AS lat,
    NULL::double precision AS lng,
    NULL::integer AS service_radius_km,
    NULL::text AS status,
    NULL::text AS profile_status,
    NULL::boolean AS is_active,
    NULL::boolean AS is_visible,
    NULL::timestamptz AS published_at,
    NULL::timestamptz AS created_at,
    NULL::timestamptz AS updated_at,
    NULL::text AS remediation_reasons,
    NULL::integer AS problem_count,
    count(*)::bigint AS total_affected,
    count(*) FILTER (
      WHERE 'missing_radius' = ANY (remediation_reasons)
    )::bigint AS missing_radius,
    count(*) FILTER (
      WHERE 'invalid_radius' = ANY (remediation_reasons)
    )::bigint AS invalid_radius,
    count(*) FILTER (
      WHERE 'missing_postal_code' = ANY (remediation_reasons)
    )::bigint AS missing_postal_code,
    count(*) FILTER (
      WHERE 'missing_city' = ANY (remediation_reasons)
    )::bigint AS missing_city,
    count(*) FILTER (
      WHERE 'missing_coordinates' = ANY (remediation_reasons)
    )::bigint AS missing_coordinates,
    count(*) FILTER (
      WHERE 'zero_coordinates' = ANY (remediation_reasons)
    )::bigint AS zero_coordinates,
    count(*) FILTER (
      WHERE 'missing_country' = ANY (remediation_reasons)
    )::bigint AS missing_country,
    count(*) FILTER (
      WHERE 'unsupported_country' = ANY (remediation_reasons)
    )::bigint AS unsupported_country
  FROM affected
)
SELECT *
FROM profile_rows
UNION ALL
SELECT *
FROM summary_row
ORDER BY
  CASE WHEN row_type = 'profile' THEN 0 ELSE 1 END,
  problem_count DESC NULLS LAST,
  name ASC NULLS LAST,
  id ASC NULLS LAST;
