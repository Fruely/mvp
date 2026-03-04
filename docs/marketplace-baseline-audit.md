# Freuly Marketplace Baseline Audit

This file freezes the current baseline before the new specialist funnel rollout.

## Runtime stack

- Next.js App Router
- Supabase (Auth + Postgres + Storage)
- Tailwind UI

## Existing domain tables (as used by code)

- `specialists`
- `specialist_profiles`
- `specialist_services`
- `specialist_applications`
- `leads`
- `categories`
- `homepage_popular_categories`
- `site_blocks`
- `homepage_social_insights`
- `homepage_social_insight_items`

## Existing API contracts (current production-facing paths)

- Specialist intake:
  - `POST /api/specialists/application`
  - `GET /api/specialists/verify-email`
  - `POST /api/specialists/upload-proof`
  - `POST /api/specialist/claim-init`
  - `POST /api/specialist/set-password`
- Specialist public discovery:
  - `GET /api/specialists/categories`
  - `GET /api/specialists/list`
  - `GET /api/specialists/search`
  - `GET /api/specialists/[id]`
- Specialist dashboard:
  - `GET|POST|PATCH|DELETE /api/specialist/services`
  - `PUT /api/specialist/profile`
  - `POST /api/specialist/avatar/upload`
- Leads:
  - `POST /api/leads/create`
  - `PATCH /api/specialist/leads/status`
  - `GET /api/admin/leads`
  - `PATCH /api/admin/leads/status`
- Moderation/admin:
  - `GET /api/admin/specialists/pending`
  - `POST /api/admin/specialists/update`
  - `PATCH /api/admin/specialists/[id]/active`
  - `GET /api/admin/stats`
- Homepage data:
  - `GET /api/homepage/popular-categories`
  - `GET|POST /api/site-blocks`
  - `POST /api/site-blocks/upload`

## Existing status usage snapshot

- `specialists.status` currently depends on legacy flow (`approved`, `paused`, `pending` in code paths).
- Visibility currently controlled by `status + is_active + is_visible`.
- `leads.status`: `new | contacted | closed`.
- `specialist_applications.status`: `email_pending | pending_review | approved | rejected`.

## Current URL topology snapshot

- Homepage: `/{lang}`
- Category listing: `/{lang}/category/[slug]`
- Public specialist page: `/{lang}/specialist/[id]` (to be migrated to slug)
- Specialist dashboard: `/specialist/dashboard/*`
- Search result page: `/specialists`

## Baseline risk notes

- Mixed moderation model (`specialist_applications` + `specialists`) can diverge.
- Detail endpoint `/api/specialists/[id]` is less strict than list/search visibility.
- Repository has partial SQL history; no single schema source-of-truth.
