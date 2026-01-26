# Freuly — Project Map (Production)

This document contains all entry points, dashboards, admin areas and technical routes
used during development, debugging and moderation.

---

## Dev access (important)

To access the site in dev mode (bypass __closed gate):

https://freuly.de/?dev=DEV_ACCESS_KEY

- Sets `freuly_dev` cookie
- Grants access to all public pages
- Required in incognito or after cookie reset

---

## Public site (with language)

Home:
- https://freuly.de/ua
- https://freuly.de/ru
- https://freuly.de/de

Category page:
- https://freuly.de/{lang}/category/{slug}

Specialist public profile:
- https://freuly.de/{lang}/specialist/{specialist_id}

Become a specialist:
- https://freuly.de/{lang}/become-specialist

---

## Closed / dev-gate page

Closed access page:
- https://freuly.de/__closed

Shown when dev cookie is missing.

---

## Admin panel

Admin login:
- https://freuly.de/admin/login

Admin dashboard:
- https://freuly.de/admin

Specialists moderation:
- https://freuly.de/admin/specialists

Moderation audit log:
- https://freuly.de/admin/specialists/audit

Leads:
- https://freuly.de/admin/leads

Site blocks / content:
- https://freuly.de/admin/site-blocks

---

## Specialist dashboard (protected)

Specialist dashboard:
- https://freuly.de/specialist/dashboard

Access:
- Currently via `specialist_id` cookie (technical access)
- Final auth flow will be added later

Shows:
- profile status
- rejection reason (if any)
- next steps

---

## Client dashboard (skeleton)

Client dashboard:
- https://freuly.de/client/dashboard

Access:
- via `client_id` cookie (technical)
- placeholder for future client logic

---

## Notes

- Project runs fully on production (Vercel)
- Local environment is no longer required for daily work
- This map is the single source of truth for navigation during development
