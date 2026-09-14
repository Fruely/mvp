# Specialist funnel history accuracy

The admin event journal reads from `specialist_funnel_events`.

Historical reconstruction quality:

- `registered`: exact from `specialists.created_at`.
- `dashboard_opened`: exact where `first_dashboard_visit_at` existed before funnel tracking was introduced.
- `profile_started`: historical timestamp is approximate because the original first-save timestamp was not persisted; backfill uses the available specialist update timestamp.
- `checkout_started`: reconstructed from persisted `plan_payments` checkout/payment state and timestamps.
- `paid`: exact where `paid_at` exists.
- `published`: exact where `published_at` exists.

Events created after the funnel migration are canonical real-time events and do not use reconstruction.
