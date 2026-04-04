-- Keep specialist_services.category_id aligned with specialists.category_id.
-- 1) When the specialist's main category changes, push to all their services.
-- 2) Before any insert/update on a service row, force category_id from the specialist row.

CREATE OR REPLACE FUNCTION public.sync_specialist_services_category_from_specialist()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    UPDATE public.specialist_services ss
    SET category_id = NEW.category_id
    WHERE ss.specialist_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_specialists_sync_services_category ON public.specialists;

CREATE TRIGGER trg_specialists_sync_services_category
AFTER UPDATE OF category_id ON public.specialists
FOR EACH ROW
EXECUTE FUNCTION public.sync_specialist_services_category_from_specialist();

CREATE OR REPLACE FUNCTION public.specialist_services_enforce_specialist_category()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  spec_category uuid;
BEGIN
  SELECT s.category_id INTO spec_category
  FROM public.specialists s
  WHERE s.id = NEW.specialist_id;

  NEW.category_id := spec_category;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_specialist_services_enforce_category ON public.specialist_services;

CREATE TRIGGER trg_specialist_services_enforce_category
BEFORE INSERT OR UPDATE ON public.specialist_services
FOR EACH ROW
EXECUTE FUNCTION public.specialist_services_enforce_specialist_category();
