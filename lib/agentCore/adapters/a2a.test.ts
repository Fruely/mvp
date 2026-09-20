import assert from "node:assert/strict";
import test from "node:test";
import {
  FREULY_A2A_PROTOCOL_VERSION,
  buildFreulyA2AAgentCard,
  dispatchFreulyA2ARequest,
  parseFreulyA2AJsonRpc,
  validateFreulyA2AVersion,
} from "./a2a.ts";

test("Agent Card declares an A2A 1.0 read-only JSON-RPC agent", () => {
  const card = buildFreulyA2AAgentCard();

  assert.equal(card.supportedInterfaces.length, 1);
  assert.deepEqual(card.supportedInterfaces[0], {
    url: "https://freuly.de/api/a2a",
    protocolBinding: "JSONRPC",
    protocolVersion: "1.0",
  });
  assert.equal(card.capabilities.streaming, false);
  assert.equal(card.capabilities.pushNotifications, false);
  assert.equal(card.capabilities.extendedAgentCard, false);
  assert.deepEqual(card.defaultInputModes, ["application/json"]);
  assert.deepEqual(card.defaultOutputModes, ["application/json"]);
  assert.deepEqual(
    card.skills.map((skill) => skill.id),
    ["search_specialists", "get_specialist"],
  );

  const serialized = JSON.stringify(card);
  assert.equal(serialized.includes("create_service_request"), false);
  assert.equal(serialized.includes("express_interest"), false);
  assert.equal(serialized.includes("accept_match"), false);
});

test("A2A version header must be 1.0", () => {
  const good = validateFreulyA2AVersion(
    new Headers({ "A2A-Version": FREULY_A2A_PROTOCOL_VERSION }),
    1,
  );
  assert.equal(good.ok, true);

  const missing = validateFreulyA2AVersion(new Headers(), 2);
  assert.equal(missing.ok, false);
  if (!missing.ok) {
    assert.equal(missing.status, 400);
    assert.equal(missing.body.error.code, -32009);
  }

  const old = validateFreulyA2AVersion(
    new Headers({ "A2A-Version": "0.3" }),
    3,
  );
  assert.equal(old.ok, false);
  if (!old.ok) {
    assert.equal(old.body.error.code, -32009);
  }
});

test("JSON-RPC envelope validation rejects malformed params", () => {
  const valid = parseFreulyA2AJsonRpc({
    jsonrpc: "2.0",
    id: "x",
    method: "SendMessage",
    params: {},
  });
  assert.equal(valid.ok, true);

  const invalid = parseFreulyA2AJsonRpc({
    jsonrpc: "2.0",
    id: "x",
    method: "SendMessage",
    params: [],
  });
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.equal(invalid.body.error.code, -32602);
  }
});

test("SendMessage search action delegates to canonical Freuly search", async () => {
  let received: unknown = null;
  const result = await dispatchFreulyA2ARequest(
    {
      jsonrpc: "2.0",
      id: "send-1",
      method: "SendMessage",
      params: {
        message: {
          messageId: "msg-1",
          role: "ROLE_USER",
          contextId: "ctx-1",
          parts: [
            {
              data: {
                action: "search_specialists",
                input: {
                  language: "ru",
                  category: "psychologists",
                  online_only: true,
                  place: "Berlin",
                  radius_km: 25,
                  offset: 0,
                },
              },
              mediaType: "application/json",
            },
          ],
        },
      },
    },
    {
      searchSpecialists: async (input) => {
        received = input;
        return { data: [{ id: "spec-1" }] };
      },
      getSpecialist: async () => ({
        ok: false,
        status: 404,
        message: "not used",
      }),
    },
  );

  assert.deepEqual(received, {
    lang: "ru",
    category: "psychologists",
    place: "Berlin",
    mode: "online",
    q: null,
    radius: 25,
    offset: 0,
  });

  const body = result as {
    result: {
      message: {
        messageId: string;
        role: string;
        contextId: string;
        parts: Array<{ data: Record<string, unknown>; mediaType: string }>;
      };
    };
  };

  assert.equal(body.result.message.role, "ROLE_AGENT");
  assert.equal(body.result.message.messageId, "freuly:msg-1");
  assert.equal(body.result.message.contextId, "ctx-1");
  assert.equal(body.result.message.parts[0].mediaType, "application/json");
  assert.deepEqual(body.result.message.parts[0].data, {
    ok: true,
    action: "search_specialists",
    result: { data: [{ id: "spec-1" }] },
  });
});

test("SendMessage get specialist delegates only public lookup", async () => {
  const result = await dispatchFreulyA2ARequest(
    {
      jsonrpc: "2.0",
      id: "send-2",
      method: "SendMessage",
      params: {
        message: {
          messageId: "msg-2",
          role: "ROLE_USER",
          parts: [
            {
              data: {
                action: "get_specialist",
                input: {
                  specialist_id: "anna",
                  language: "de",
                },
              },
              mediaType: "application/json",
            },
          ],
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
        return {
          ok: true,
          value: {
            data: {
              id: "spec-1",
              name: "Anna",
              languages: ["de", "ru"],
              specialist_services: [],
            },
          },
        };
      },
    },
  );

  const body = result as {
    result: {
      message: {
        parts: Array<{ data: Record<string, unknown> }>;
      };
    };
  };
  assert.equal(body.result.message.parts[0].data.action, "get_specialist");
  assert.equal(
    (body.result.message as { contextId: string }).contextId,
    "freuly-context:msg-2",
  );
});

test("A2A rejects text-only and write actions rather than inventing behavior", async () => {
  const deps = {
    searchSpecialists: async () => ({ data: [] }),
    getSpecialist: async () => ({
      ok: false as const,
      status: 404,
      message: "not used",
    }),
  };

  const textOnly = await dispatchFreulyA2ARequest(
    {
      jsonrpc: "2.0",
      id: 1,
      method: "SendMessage",
      params: {
        message: {
          messageId: "msg-text",
          role: "ROLE_USER",
          parts: [{ text: "Find a psychologist", mediaType: "text/plain" }],
        },
      },
    },
    deps,
  );
  assert.equal(
    (textOnly as { error: { code: number } }).error.code,
    -32602,
  );

  const write = await dispatchFreulyA2ARequest(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "SendMessage",
      params: {
        message: {
          messageId: "msg-write",
          role: "ROLE_USER",
          parts: [
            {
              data: {
                action: "create_service_request",
                input: {},
              },
              mediaType: "application/json",
            },
          ],
        },
      },
    },
    deps,
  );
  assert.equal(
    (write as { error: { code: number } }).error.code,
    -32602,
  );
});

test("stateless read agent exposes empty/no-task semantics", async () => {
  const deps = {
    searchSpecialists: async () => ({ data: [] }),
    getSpecialist: async () => ({
      ok: false as const,
      status: 404,
      message: "not used",
    }),
  };

  const getTask = await dispatchFreulyA2ARequest(
    {
      jsonrpc: "2.0",
      id: 1,
      method: "GetTask",
      params: { id: "task-1" },
    },
    deps,
  );
  assert.equal((getTask as { error: { code: number } }).error.code, -32001);

  const listTasks = await dispatchFreulyA2ARequest(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "ListTasks",
      params: { pageSize: 25 },
    },
    deps,
  );
  assert.deepEqual(
    (listTasks as { result: unknown }).result,
    {
      tasks: [],
      nextPageToken: "",
      pageSize: 25,
      totalSize: 0,
    },
  );

  const cancel = await dispatchFreulyA2ARequest(
    {
      jsonrpc: "2.0",
      id: 3,
      method: "CancelTask",
      params: { id: "task-1" },
    },
    deps,
  );
  assert.equal((cancel as { error: { code: number } }).error.code, -32001);
});

test("streaming, push notifications and extended card are explicitly unsupported", async () => {
  const deps = {
    searchSpecialists: async () => ({ data: [] }),
    getSpecialist: async () => ({
      ok: false as const,
      status: 404,
      message: "not used",
    }),
  };

  const streaming = await dispatchFreulyA2ARequest(
    {
      jsonrpc: "2.0",
      id: 1,
      method: "SendStreamingMessage",
      params: {},
    },
    deps,
  );
  assert.equal(
    (streaming as { error: { code: number } }).error.code,
    -32004,
  );

  const push = await dispatchFreulyA2ARequest(
    {
      jsonrpc: "2.0",
      id: 2,
      method: "ListTaskPushNotificationConfigs",
      params: {},
    },
    deps,
  );
  assert.equal((push as { error: { code: number } }).error.code, -32003);

  const extended = await dispatchFreulyA2ARequest(
    {
      jsonrpc: "2.0",
      id: 3,
      method: "GetExtendedAgentCard",
    },
    deps,
  );
  assert.equal(
    (extended as { error: { code: number } }).error.code,
    -32007,
  );
});

test("unknown methods use standard JSON-RPC Method not found", async () => {
  const result = await dispatchFreulyA2ARequest(
    {
      jsonrpc: "2.0",
      id: 1,
      method: "MakePurchase",
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

  assert.equal((result as { error: { code: number } }).error.code, -32601);
});
