import assert from "node:assert/strict";
import test from "node:test";

/**
 * Contract guard: ownership migration must not re-scope idempotency indexes.
 * Global UNIQUE(client_idempotency_key) remains owned by the mutation-idempotency migration.
 */
test("ownership migration documents prerequisite and avoids index rescope", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const path = fileURLToPath(
    new URL("../../supabase/manual_migrations/2026-08-16_client_request_ownership.sql", import.meta.url),
  );
  const sql = await readFile(path, "utf8");

  assert.match(sql, /2026-08-16_client_mutation_idempotency\.sql/);
  assert.doesNotMatch(sql, /DROP INDEX IF EXISTS public\.uq_leads_client_idempotency_key/);
  assert.doesNotMatch(sql, /uq_leads_client_idempotency_key_owned/);
  assert.match(sql, /client_user_id/);
});
