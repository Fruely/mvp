-- Disable legacy automatic service category synchronization.
--
-- Why:
-- Services must not silently move to a new specialist category when the specialist
-- changes their main category. A service is considered valid for the current
-- category only after the specialist explicitly creates/edits/saves it for that
-- category via /api/specialist/services.

DROP TRIGGER IF EXISTS trg_specialists_sync_services_category ON public.specialists;
DROP TRIGGER IF EXISTS trg_specialist_services_enforce_category ON public.specialist_services;

DROP FUNCTION IF EXISTS public.sync_specialist_services_category_from_specialist();
DROP FUNCTION IF EXISTS public.specialist_services_enforce_specialist_category();
