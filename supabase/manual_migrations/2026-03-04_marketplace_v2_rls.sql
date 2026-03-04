-- Marketplace v2 RLS policies for new domain tables.

BEGIN;

ALTER TABLE IF EXISTS public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.specialist_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.specialist_plan ENABLE ROW LEVEL SECURITY;

-- Public read for active services taxonomy.
DROP POLICY IF EXISTS services_public_read ON public.services;
CREATE POLICY services_public_read
ON public.services
FOR SELECT
USING (is_active = true);

-- Specialist can manage own assets (requires user_id linkage in specialists).
DROP POLICY IF EXISTS specialist_assets_owner_read ON public.specialist_assets;
CREATE POLICY specialist_assets_owner_read
ON public.specialist_assets
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.specialists s
    WHERE s.id = specialist_assets.specialist_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS specialist_assets_owner_write ON public.specialist_assets;
CREATE POLICY specialist_assets_owner_write
ON public.specialist_assets
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.specialists s
    WHERE s.id = specialist_assets.specialist_id
      AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.specialists s
    WHERE s.id = specialist_assets.specialist_id
      AND s.user_id = auth.uid()
  )
);

-- Specialist can read own plan only.
DROP POLICY IF EXISTS specialist_plan_owner_read ON public.specialist_plan;
CREATE POLICY specialist_plan_owner_read
ON public.specialist_plan
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.specialists s
    WHERE s.id = specialist_plan.specialist_id
      AND s.user_id = auth.uid()
  )
);

COMMIT;
