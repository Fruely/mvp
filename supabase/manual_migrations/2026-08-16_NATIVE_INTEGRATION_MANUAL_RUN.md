# Manual migration run — 2026-08-16 (Native integration gate)

Run these **manually in Supabase SQL Editor** against the target Freuly project.

**Do not use Supabase CLI** (project convention: see `2026-08-15_MANUAL_RUN.md`).

**Do not run migration 2 before migration 1 is verified.**

**Do not run migration 3 before migrations 1–2 are verified** (no hard FK dependency, but apply in documented order).

**If any SQL error appears, stop and copy the exact error before retrying.**

---

## Execution order

1. `2026-08-16_client_mutation_idempotency.sql`
2. `2026-08-16_client_request_ownership.sql`
3. `2026-08-16_specialist_service_create_idempotency.sql`

All three files are additive and idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE … IF NOT EXISTS`).

Migration 2 adds ownership columns only — **no email/phone heuristic backfill**.

---

## Preflight — migration 1 (client mutation idempotency)

### A) Column presence

```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('leads', 'service_requests')
  AND column_name IN ('client_idempotency_key', 'client_idempotency_fingerprint')
ORDER BY 1, 2;
```

Expect **0 rows** before apply; **4 rows** after apply.

### B) Index presence + predicate

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'uq_leads_client_idempotency_key',
    'uq_service_requests_client_idempotency_key'
  );
```

Expect partial unique indexes with `WHERE (client_idempotency_key IS NOT NULL)`.

### C) Duplicate non-null keys (must be 0 before UNIQUE index creation)

```sql
SELECT 'leads' AS tbl, client_idempotency_key, COUNT(*) AS cnt
FROM public.leads
WHERE client_idempotency_key IS NOT NULL
GROUP BY client_idempotency_key
HAVING COUNT(*) > 1
UNION ALL
SELECT 'service_requests', client_idempotency_key, COUNT(*)
FROM public.service_requests
WHERE client_idempotency_key IS NOT NULL
GROUP BY client_idempotency_key
HAVING COUNT(*) > 1;
```

**STOP if any rows.** Do not delete/update production rows automatically.

---

## Preflight — migration 2 (client request ownership)

Requires migration 1 verified.

### A) Column presence

```sql
SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('leads', 'service_requests')
  AND column_name = 'client_user_id';
```

Expect **0 rows** before apply; **2 rows**, nullable `YES`, after apply.

### B) Indexes

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_leads_client_user_created_at',
    'idx_service_requests_client_user_created_at'
  );
```

Expect partial indexes `WHERE (client_user_id IS NOT NULL)`.

### C) No heuristic backfill in SQL

Migration file contains **only** `ADD COLUMN` + index creation. Existing rows remain `client_user_id NULL` unless set by future authenticated creates.

---

## Preflight — migration 3 (specialist service create idempotency)

### A) Column presence

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'specialist_services'
  AND column_name IN (
    'client_idempotency_key',
    'client_idempotency_fingerprint',
    'owner_user_id'
  )
ORDER BY 1;
```

Expect **0 rows** before apply; **3 rows** after apply.

### B) Index presence + predicate

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname = 'uq_specialist_services_client_idempotency_key';
```

Expect partial unique index `WHERE (client_idempotency_key IS NOT NULL)`.

### C) Duplicate non-null keys

```sql
SELECT client_idempotency_key, COUNT(*) AS cnt
FROM public.specialist_services
WHERE client_idempotency_key IS NOT NULL
GROUP BY client_idempotency_key
HAVING COUNT(*) > 1;
```

**STOP if any rows.**

---

## Post-apply verification (all migrations)

Re-run sections **A/B** for each migration. Confirm duplicate checks return **0 rows**.

---

## Integration branch reference

Producer: `release/native-integration-2026-08` @ `2877fbf549c41ee3514090bacd35b478b1a6571d`
