-- Optional migration: add columns for /specialists listing (online/offline/hybrid, geo).
-- Run only if your specialists table does not yet have these columns.

-- work_format: 'online' | 'offline' | 'hybrid'. Default 'online' for existing rows.
ALTER TABLE specialists
  ADD COLUMN IF NOT EXISTS work_format text DEFAULT 'online'
    CHECK (work_format IN ('online', 'offline', 'hybrid'));

-- Geo: plz (German PLZ), lat/lng (WGS84), service_radius_km for offline specialists.
ALTER TABLE specialists
  ADD COLUMN IF NOT EXISTS plz text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS service_radius_km int;

COMMENT ON COLUMN specialists.work_format IS 'online | offline | hybrid';
COMMENT ON COLUMN specialists.service_radius_km IS 'Max distance (km) for offline services; used only when work_format = offline.';
