import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { USER_DELEGATABLE_CAPABILITIES } from "./types.ts";

const migrationPath = path.join(
  process.cwd(),
  "supabase/manual_migrations/2026-09-20_agent_delegation_foundation.sql",
);
const sql = readFileSync(migrationPath, "utf8");

function sqlAllowlist(): string[] {
  const block = sql.match(
    /agent_delegations_capabilities_allowlist_check[\s\S]*?ARRAY\[([\s\S]*?)\]::text\[\]/,
  );
  assert.ok(block, "missing delegation capability allowlist");
  return [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
}

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
  assert.deepEqual(sqlAllowlist(), [...USER_DELEGATABLE_CAPABILITIES]);
});

test("delegation history is revoke-only and cannot be cascaded away", () => {
  assert.match(
    sql,
    /agent_client_id uuid NOT NULL REFERENCES public\.agent_clients \(id\) ON DELETE RESTRICT/,
  );
  assert.match(
    sql,
    /user_id uuid NOT NULL REFERENCES auth\.users \(id\) ON DELETE RESTRICT/,
  );
  assert.doesNotMatch(sql, /ON DELETE CASCADE/i);
  assert.match(
    sql,
    /GRANT SELECT, INSERT, UPDATE ON TABLE public\.agent_delegations TO service_role/,
  );
  assert.match(
    sql,
    /REVOKE DELETE ON TABLE public\.agent_delegations FROM service_role/,
  );
  assert.doesNotMatch(
    sql,
    /GRANT ALL ON TABLE public\.agent_delegations TO service_role/,
  );
});

test("delegation table is inaccessible to browser roles", () => {
  assert.match(sql, /ALTER TABLE public\.agent_delegations ENABLE ROW LEVEL SECURITY/i);
  assert.match(
    sql,
    /REVOKE ALL ON TABLE public\.agent_delegations FROM anon, authenticated/i,
  );
});

test("agentDelegation runtime never issues DELETE against consent rows", () => {
  const directory = path.join(process.cwd(), "lib/agentDelegation");
  const sources = readdirSync(directory)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => readFileSync(path.join(directory, name), "utf8"));

  for (const source of sources) {
    assert.doesNotMatch(source, /\.delete\s*\(/);
  }
});
