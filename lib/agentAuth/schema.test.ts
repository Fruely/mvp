import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../supabase/manual_migrations/2026-09-20_agent_auth_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);

test("agent auth schema never persists a raw API credential", () => {
  assert.match(migration, /credential_hash text NOT NULL/);
  assert.match(migration, /key_prefix text NOT NULL/);
  assert.doesNotMatch(migration, /raw_(token|credential|secret)\s+text/i);
  assert.doesNotMatch(migration, /api_key\s+text/i);
});

test("agent auth tables are service-role only with RLS enabled", () => {
  for (const table of [
    "agent_clients",
    "agent_credentials",
    "agent_api_audit_events",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY`,
      ),
    );
    assert.match(
      migration,
      new RegExp(
        `REVOKE ALL ON TABLE public\\.${table} FROM anon, authenticated`,
      ),
    );
    assert.match(
      migration,
      new RegExp(
        `GRANT ALL ON TABLE public\\.${table} TO service_role`,
      ),
    );
  }
});

test("credential schema supports rotation and revocation without changing agent identity", () => {
  assert.match(
    migration,
    /agent_client_id uuid NOT NULL REFERENCES public\.agent_clients \(id\) ON DELETE CASCADE/,
  );
  assert.match(migration, /status text NOT NULL DEFAULT 'active'/);
  assert.match(migration, /expires_at timestamptz NULL/);
  assert.match(migration, /revoked_at timestamptz NULL/);
  assert.match(migration, /last_used_at timestamptz NULL/);
});

test("audit schema contains identifiers and outcome but no request body or contact payload column", () => {
  assert.match(migration, /agent_client_id uuid NULL/);
  assert.match(migration, /credential_id uuid NULL/);
  assert.match(migration, /request_id text NULL/);
  assert.match(migration, /capability text NULL/);
  assert.match(migration, /outcome text NOT NULL/);
  assert.doesNotMatch(migration, /request_body\s+/i);
  assert.doesNotMatch(migration, /client_(email|phone|name)\s+/i);
  assert.doesNotMatch(migration, /ip_address\s+/i);
});
