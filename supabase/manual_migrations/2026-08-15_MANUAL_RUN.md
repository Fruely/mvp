# Manual migration run — 2026-08-15 (timing + promoted reservations)

Run these **manually in Supabase SQL Editor**.

**Do not use Supabase CLI.**

**Do not run the second migration if the first verification shows an unexpected schema state.**

**If any SQL error appears, stop and copy the exact error before retrying.**

---

## Execution order

### 1. Apply service request timing

Run:

`supabase/manual_migrations/2026-08-15_service_request_timing.sql`

### 2. Verify timing migration

Run:

`supabase/manual_migrations/2026-08-15_service_request_timing.verify.sql`

### 3. Confirm PASS / expected schema output

In section **A) Summary**, expect:

- `timing_columns_present` → **PASS** (actual `6`)
- `timing_constraints_present` → **PASS** (actual `8`)
- Section **D) Missing timing columns** → **0 rows**

Legacy rows may still have NULL timing — that is expected.

### 4. Apply promoted request reservations

Run:

`supabase/manual_migrations/2026-08-15_promoted_request_reservations.sql`

### 5. Verify reservations migration

Run:

`supabase/manual_migrations/2026-08-15_promoted_request_reservations.verify.sql`

### 6. Confirm PASS / expected schema output

In section **A) Summary**, expect:

- `table_exists` → **PASS**
- `primary_key_exists` → **PASS**
- `foreign_keys_count` → **PASS** (actual `4`)
- `indexes_count` → **PASS**
- `rls_enabled` → **PASS**
- `reservation_rows` → **PASS** (`0` on fresh apply)

Section **H) Table privileges**: `anon` and `authenticated` should have **no rows**; `service_role` should have privileges.

### 7. Proceed to E2E smoke

Only after **both** verification steps pass with the expected output above.

---

## Prerequisites (must already exist in production)

These tables are referenced by the reservations migration and must exist before step 4:

- `public.service_request_promotions`
- `public.specialists`
- `public.service_request_promotion_signup_bindings`
- `public.promoted_request_payments`

---

## Notes

- Both migration files use `BEGIN;` / `COMMIT;` transaction wrappers.
- Timing migration is additive only — it does not modify or delete existing `service_requests` rows.
- Reservations migration creates a new table only — no changes to existing promoted billing tables.
