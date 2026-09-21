import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { FREULY_CAPABILITY_CORE } from "../agentCore/freuly.ts";
import {
  clientScopesAreKnown,
  isKnownAgentScope,
  listCapabilityCoreScopes,
} from "./scopes.ts";

const EXPECTED_SCOPES = [
  "leads:discover",
  "leads:read",
  "leads:respond",
  "matches:read",
  "matches:respond",
  "requests:cancel",
  "requests:create",
  "requests:read",
];

test("Capability Core scope vocabulary is exactly the authenticated Agent API set", () => {
  assert.deepEqual(listCapabilityCoreScopes(), EXPECTED_SCOPES);
  assert.equal(isKnownAgentScope("requests:create"), true);
  assert.equal(isKnownAgentScope("admin:all"), false);
  assert.equal(clientScopesAreKnown(["requests:read", "matches:read"]), true);
  assert.equal(clientScopesAreKnown(["requests:read", "root"]), false);
});

test("every authenticated Capability Core capability uses the shared scope vocabulary", () => {
  for (const capability of FREULY_CAPABILITY_CORE.capabilities) {
    for (const scope of capability.required_scopes ?? []) {
      assert.equal(isKnownAgentScope(scope), true, `${capability.id}:${scope}`);
    }
  }
});

test("agentAuth runtime never issues DELETE against principal or audit tables", () => {
  const directory = join(process.cwd(), "lib/agentAuth");
  const sources = readdirSync(directory)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => readFileSync(join(directory, name), "utf8"));

  for (const source of sources) {
    assert.doesNotMatch(source, /\.delete\s*\(/);
    assert.doesNotMatch(source, /from\("agent_clients"\)[\s\S]{0,120}\.delete/);
    assert.doesNotMatch(source, /from\("agent_credentials"\)[\s\S]{0,120}\.delete/);
    assert.doesNotMatch(source, /from\("agent_api_audit_events"\)[\s\S]{0,120}\.delete/);
  }
});
