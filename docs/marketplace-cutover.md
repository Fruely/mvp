# Marketplace v2 Cutover Notes

## Feature flags

- `NEW_SPECIALIST_FUNNEL_ENABLED`
- `NEW_SPECIALIST_DASHBOARD_ENABLED`
- `FEATURED_HOME_BLOCK_ENABLED`
- `PROGRAMMATIC_SEO_ENABLED`
- `NEXT_PUBLIC_FEATURED_HOME_BLOCK_ENABLED` (client read for homepage block)

## Current cutover state

- New specialist funnel is available behind `NEW_SPECIALIST_FUNNEL_ENABLED`.
- Unified dashboard is available behind `NEW_SPECIALIST_DASHBOARD_ENABLED`.
- Featured homepage block is available behind `FEATURED_HOME_BLOCK_ENABLED`.
- Programmatic SEO routes `/services/...` are guarded by `PROGRAMMATIC_SEO_ENABLED`.
- Legacy application/claim flow is still present as fallback while metrics stabilize.

## Final removal checklist (after stabilization window)

1. Switch all flags to enabled in production.
2. Confirm:
   - specialist signup -> dashboard conversion,
   - draft -> published_unverified -> featured_verified transitions,
   - homepage featured block fill-rate,
   - SEO traffic landing and indexing.
3. Remove legacy specialist application endpoints:
   - `/api/specialists/application`
   - `/api/specialists/verify-email`
   - legacy admin application moderation reads for `specialist_applications`
4. Remove legacy claim flow routes after migration lock.
5. Enforce stricter DB constraints (status check VALIDATE, NOT NULL where required).
