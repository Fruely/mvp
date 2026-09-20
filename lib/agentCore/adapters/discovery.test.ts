import assert from "node:assert/strict";
import test from "node:test";
import { buildFreulyArdManifest } from "./ard.ts";
import { buildFreulyReadOnlyOpenApiDocument } from "./openapi.ts";

test("ARD manifest advertises OpenAPI, MCP and A2A read interfaces", () => {
  const manifest = buildFreulyArdManifest();
  const entry = manifest.entries[0];
  const mcpEntry = manifest.entries[1];
  const a2aEntry = manifest.entries[2];

  assert.equal(entry.identifier, "urn:air:freuly.de:api:specialist-search");
  assert.equal(entry.type, "application/openapi+json");
  assert.equal(entry.url, "https://freuly.de/.well-known/openapi.json");
  assert.ok(entry.representativeQueries.length >= 2);
  assert.ok(entry.representativeQueries.length <= 5);
  assert.deepEqual(entry.capabilities, ["search_specialists", "get_specialist"]);

  assert.equal(mcpEntry.identifier, "urn:air:freuly.de:mcp:read");
  assert.equal(mcpEntry.url, "https://freuly.de/api/mcp");
  assert.equal(mcpEntry.metadata.transport, "streamable-http");
  assert.equal(mcpEntry.metadata.protocolVersion, "2026-07-28");
  assert.equal(mcpEntry.metadata.readOnly, true);

  assert.equal(a2aEntry.identifier, "urn:air:freuly.de:a2a:read");
  assert.equal(a2aEntry.url, "https://freuly.de/.well-known/agent-card.json");
  assert.equal(a2aEntry.metadata.protocolVersion, "1.0");
  assert.equal(a2aEntry.metadata.protocolBinding, "JSONRPC");
  assert.equal(a2aEntry.metadata.readOnly, true);
});

test("public discovery beacon never advertises write execution", () => {
  const manifest = JSON.stringify(buildFreulyArdManifest());

  assert.equal(manifest.includes("create_service_request"), false);
  assert.equal(manifest.includes("express_interest"), false);
  assert.equal(manifest.includes("accept_match"), false);
});

test("OpenAPI discovery document maps only existing public read operations", () => {
  const document = buildFreulyReadOnlyOpenApiDocument();
  const paths = Object.keys(document.paths);

  assert.deepEqual(paths.sort(), [
    "/api/specialists/{id}",
    "/api/specialists/search",
  ]);

  assert.equal(document.paths["/api/specialists/search"].get.operationId, "search_specialists");
  assert.equal(document.paths["/api/specialists/{id}"].get.operationId, "get_specialist");
  assert.equal(document["x-agent-safety"].readOnly, true);
  assert.equal(document["x-agent-safety"].writeCapabilitiesAdvertised, false);
});

test("OpenAPI document contains no write HTTP methods", () => {
  const document = buildFreulyReadOnlyOpenApiDocument() as {
    paths: Record<string, Record<string, unknown>>;
  };

  for (const item of Object.values(document.paths)) {
    for (const method of ["post", "put", "patch", "delete"]) {
      assert.equal(method in item, false);
    }
  }
});
