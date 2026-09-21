import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { listCapabilityCoreScopes } from "./scopes.ts";

const migration = readFileSync(
  new URL(
    "../../supabase/manual_migrations/2026-09-20_agent_auth_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);

function sqlAllowlist(name: string): string[] {
  const block = migration.match(
    new RegExp(
      `${name}[\\s\\S]*?ARRAY\\[([\\s\\S]*?)\\]::text\\[\\]`,
    ),
  );
  assert.ok(block, `missing SQL allowlist ${name}`);
  return [...block[1].matchAll(/'([^']+)'/g)].map((match) => match[1]).sort();
}

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
  }

  assert.match(
    migration,
    /GRANT SELECT, INSERT, UPDATE ON TABLE public\.agent_clients TO service_role/,
  );
  assert.match(
    migration,
    /GRANT SELECT, INSERT, UPDATE ON TABLE public\.agent_credentials TO service_role/,
  );
  assert.match(
    migration,
    /REVOKE DELETE ON TABLE public\.agent_clients FROM service_role/,
  );
  assert.match(
    migration,
    /REVOKE DELETE ON TABLE public\.agent_credentials FROM service_role/,
  );
  assert.match(
    migration,
    /GRANT SELECT, INSERT ON TABLE public\.agent_api_audit_events TO service_role/,
  );
  assert.match(
    migration,
    /REVOKE UPDATE, DELETE ON TABLE public\.agent_api_audit_events FROM service_role/,
  );
  assert.doesNotMatch(
    migration,
    /GRANT ALL ON TABLE public\.agent_clients TO service_role/,
  );
  assert.doesNotMatch(
    migration,
    /GRANT ALL ON TABLE public\.agent_credentials TO service_role/,
  );
  assert.doesNotMatch(
    migration,
    /GRANT ALL ON TABLE public\.agent_api_audit_events TO service_role/,
  );
});

test("principal lifecycle is disable/revoke and audit FKs preserve attribution", () => {
  assert.match(
    migration,
    /agent_client_id uuid NOT NULL REFERENCES public\.agent_clients \(id\) ON DELETE RESTRICT/,
  );
  assert.match(
    migration,
    /agent_client_id uuid NULL REFERENCES public\.agent_clients \(id\) ON DELETE RESTRICT/,
  );
  assert.match(
    migration,
    /credential_id uuid NULL REFERENCES public\.agent_credentials \(id\) ON DELETE RESTRICT/,
  );
  assert.doesNotMatch(migration, /ON DELETE CASCADE/);
  assert.doesNotMatch(
    migration,
    /agent_api_audit_events[\s\S]*ON DELETE SET NULL/,
  );
  assert.match(migration, /status text NOT NULL DEFAULT 'active'/);
  assert.match(migration, /expires_at timestamptz NULL/);
  assert.match(migration, /revoked_at timestamptz NULL/);
  assert.match(migration, /last_used_at timestamptz NULL/);
});

test("scope vocabulary in the migration matches Capability Core", () => {
  assert.deepEqual(
    sqlAllowlist("agent_clients_scopes_allowlist_check"),
    listCapabilityCoreScopes(),
  );
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
