import assert from "node:assert/strict";
import test from "node:test";
import {
  FREULY_MCP_PROTOCOL_VERSION,
  buildFreulyMcpDiscoverResult,
  buildFreulyMcpToolCatalog,
  dispatchFreulyMcpRequest,
  validateFreulyMcpHttpRequest,
} from "./mcp.ts";

function headers(method: string, name?: string) {
  const value = new Headers({
    "MCP-Protocol-Version": FREULY_MCP_PROTOCOL_VERSION,
    "Mcp-Method": method,
  });
  if (name) value.set("Mcp-Name", name);
  return value;
}

function request(method: string, params: Record<string, unknown> = {}) {
  return {
    jsonrpc: "2.0",
    id: 1,
    method,
    params: {
      ...params,
      _meta: {
        "io.modelcontextprotocol/protocolVersion": FREULY_MCP_PROTOCOL_VERSION,
        "io.modelcontextprotocol/clientInfo": {
          name: "test-client",
          version: "1.0.0",
        },
        "io.modelcontextprotocol/clientCapabilities": {},
      },
    },
  };
}

test("MCP discovery advertises only read tools on the current stateless protocol", () => {
  const discover = buildFreulyMcpDiscoverResult();
  const tools = buildFreulyMcpToolCatalog();

  assert.deepEqual(discover.supportedVersions, ["2026-07-28"]);
  assert.equal(discover.capabilities.tools.listChanged, false);
  assert.deepEqual(
    tools.map((tool) => tool.name),
    ["search_specialists", "get_specialist"],
  );

  const serialized = JSON.stringify(tools);
  assert.equal(serialized.includes("create_service_request"), false);
  assert.equal(serialized.includes("express_interest"), false);

  for (const tool of tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.annotations.idempotentHint, true);
  }
});

test("HTTP envelope requires matching protocol, method and tool headers", () => {
  const validBody = request("tools/call", {
    name: "search_specialists",
    arguments: { language: "ru" },
  });
  const valid = validateFreulyMcpHttpRequest(
    headers("tools/call", "search_specialists"),
    validBody,
  );
  assert.equal(valid.ok, true);

  const badMethod = validateFreulyMcpHttpRequest(
    headers("tools/list"),
    validBody,
  );
  assert.equal(badMethod.ok, false);
  if (!badMethod.ok) {
    assert.equal(badMethod.status, 400);
    assert.equal(badMethod.body.error.code, -32020);
  }

  const oldVersionHeaders = headers("server/discover");
  oldVersionHeaders.set("MCP-Protocol-Version", "2025-11-25");
  const oldVersionBody = request("server/discover");
  (
    oldVersionBody.params._meta as Record<string, unknown>
  )["io.modelcontextprotocol/protocolVersion"] = "2025-11-25";

  const unsupported = validateFreulyMcpHttpRequest(
    oldVersionHeaders,
    oldVersionBody,
  );
  assert.equal(unsupported.ok, false);
  if (!unsupported.ok) {
    assert.equal(unsupported.body.error.code, -32022);
    assert.deepEqual(unsupported.body.error.data, {
      supported: ["2026-07-28"],
      requested: "2025-11-25",
    });
  }
});

test("search_specialists maps MCP arguments into canonical Freuly search input", async () => {
  let received: unknown = null;
  const result = await dispatchFreulyMcpRequest(
    {
      jsonrpc: "2.0",
      id: "search-1",
      method: "tools/call",
      params: {
        name: "search_specialists",
        arguments: {
          language: "ua",
          category: "psychologists",
          place: "Köln",
          online_only: true,
          query: "trauma",
          radius_km: 25,
          offset: 20,
        },
      },
    },
    {
      searchSpecialists: async (input) => {
        received = input;
        return { data: [{ id: "spec-1" }], mode: "query" };
      },
      getSpecialist: async () => ({
        ok: false,
        status: 404,
        message: "not used",
      }),
    },
  );

  assert.deepEqual(received, {
    lang: "ua",
    category: "psychologists",
    place: "Köln",
    mode: "online",
    q: "trauma",
    radius: 25,
    offset: 20,
  });
  assert.equal(result.status, 200);
  const body = result.body as {
    result: { isError: boolean; structuredContent: unknown };
  };
  assert.equal(body.result.isError, false);
  assert.deepEqual(body.result.structuredContent, {
    data: [{ id: "spec-1" }],
    mode: "query",
  });
});

test("tool input validation returns a model-visible execution error", async () => {
  let called = false;
  const result = await dispatchFreulyMcpRequest(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "search_specialists",
        arguments: { radius_km: 13 },
      },
    },
    {
      searchSpecialists: async () => {
        called = true;
        return {};
      },
      getSpecialist: async () => ({
        ok: false,
        status: 404,
        message: "not used",
      }),
    },
  );

  assert.equal(called, false);
  const body = result.body as {
    result: { isError: boolean; content: Array<{ text: string }> };
  };
  assert.equal(body.result.isError, true);
  assert.match(body.result.content[0].text, /radius_km/);
});

test("get_specialist returns public API payload without changing it", async () => {
  const payload = {
    data: {
      id: "spec-1",
      name: "Anna",
      languages: ["ru", "de"],
      specialist_services: [],
    },
  };

  const result = await dispatchFreulyMcpRequest(
    {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "get_specialist",
        arguments: {
          specialist_id: "anna",
          language: "de",
        },
      },
    },
    {
      searchSpecialists: async () => ({ data: [] }),
      getSpecialist: async (input) => {
        assert.deepEqual(input, {
          specialistId: "anna",
          language: "de",
        });
        return { ok: true, value: payload };
      },
    },
  );

  const body = result.body as {
    result: { isError: boolean; structuredContent: unknown };
  };
  assert.equal(body.result.isError, false);
  assert.deepEqual(body.result.structuredContent, payload);
});

test("unknown tools are protocol errors, not invented capabilities", async () => {
  const result = await dispatchFreulyMcpRequest(
    {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "create_service_request",
        arguments: {},
      },
    },
    {
      searchSpecialists: async () => ({ data: [] }),
      getSpecialist: async () => ({
        ok: false,
        status: 404,
        message: "not used",
      }),
    },
  );

  assert.equal(result.status, 400);
  const body = result.body as { error: { code: number; message: string } };
  assert.equal(body.error.code, -32602);
  assert.match(body.error.message, /Unknown tool/);
});
