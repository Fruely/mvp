-- First visit to specialist dashboard (for one-time notify)
ALTER TABLE specialists
ADD COLUMN IF NOT EXISTS first_dashboard_visit_at TIMESTAMP NULL;
