import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(
  process.cwd(),
  "supabase/manual_migrations/2026-09-20_agent_delegation_foundation.sql",
);
const sql = fs.readFileSync(migrationPath, "utf8");

test("delegation migration creates the missing canonical table", () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.agent_delegations/i);
  assert.match(sql, /agent_client_id uuid NOT NULL REFERENCES public\.agent_clients/i);
  assert.match(sql, /user_id uuid NOT NULL REFERENCES auth\.users/i);
});

test("delegation schema constrains capability set, revocation and expiry", () => {
  assert.match(sql, /cardinality\(allowed_capabilities\) > 0/i);
  assert.match(sql, /allowed_capabilities <@ ARRAY\[/i);
  assert.match(sql, /create_service_request/);
  assert.match(sql, /decline_match/);
  assert.match(sql, /status = 'revoked' AND revoked_at IS NOT NULL/i);
  assert.match(sql, /expires_at IS NULL OR expires_at > granted_at/i);
});

test("delegation table is inaccessible to browser roles", () => {
  assert.match(sql, /ALTER TABLE public\.agent_delegations ENABLE ROW LEVEL SECURITY/i);
  assert.match(
    sql,
    /REVOKE ALL ON TABLE public\.agent_delegations FROM anon, authenticated/i,
  );
  assert.match(
    sql,
    /GRANT ALL ON TABLE public\.agent_delegations TO service_role/i,
  );
});
