# Specialist Auth Flow (Next.js + Supabase)

This document captures the working authentication flow for specialist routes and common pitfalls that previously caused redirect loops and "always redirected to /login" behavior.

## Canonical flow

- Not logged in -> `/login`
- Logged in but no linked specialist profile -> `/specialist/claim`
- Logged in with specialist profile -> `/specialist/dashboard`

## Server auth client (required pattern)

Use `@supabase/ssr` + Next.js cookies in `lib/supabase/auth-server.ts`.

- Use `createServerClient(...)`
- Use `cookies()` from `next/headers`
- Provide `cookies.getAll()` and `cookies.setAll(...)`
- Use this client for `auth.getUser()` checks in server components/route handlers

Do **not** use the service-role client for user session checks.

## Service-role client

`lib/supabase/server.ts` is for admin/service operations only.

- Allowed: admin DB reads/writes, background ops
- Not allowed: `auth.getUser()` / auth-session checks

## Browser auth client

Use `@supabase/ssr` browser client in `lib/supabaseClient.ts`.

- Use `createBrowserClient(...)`
- Keep public env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## Post-login navigation

After successful sign-in in client components, call:

1. `router.refresh()`
2. `router.replace("/specialist/dashboard")`

This ensures server components see fresh auth cookies on the next render and prevents false unauthenticated redirects.

## Avoid stale-session checks

For authorization decisions, prefer `auth.getUser()` over `auth.getSession()`.

- `getSession()` can be stale/local and is not authoritative for access control.
- `getUser()` validates against Auth server and is the correct guard on server routes.

## Redirect ownership

- `/login` decides based on user + specialist linkage.
- Protected specialist pages call `getCurrentUserAndSpecialist()` and redirect unauthenticated users to `/login`.
- Claim page must not force users into dashboard based on stale local session state.

## Quick troubleshooting checklist

1. Confirm server auth helper uses `createServerClient` + cookie adapter.
2. Confirm browser helper uses `createBrowserClient`.
3. Confirm sign-in handlers call `router.refresh()` before dashboard redirect.
4. Confirm guards use `auth.getUser()` (not `getSession()`).
5. Verify no unconditional redirect from `/login` to `/specialist/claim`.
