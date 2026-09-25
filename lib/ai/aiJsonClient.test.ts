import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

register(new URL("./aiJsonClient.hooks.mjs", import.meta.url).href);

const { AI_JSON_DEFAULT_TIMEOUT_MS, requestAiJson, resolveAiJsonAuth } = await import(
  new URL("./aiJsonClient.ts", import.meta.url).href
);

type AuthLike = {
  token: string;
  endpoint: string;
  model: string;
  transport: "gateway" | "openai";
};

const AUTH: AuthLike = {
  token: "secret-token-value",
  endpoint: "https://ai-gateway.test/v1/chat/completions",
  model: "openai/gpt-5-mini",
  transport: "gateway",
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["value"],
  properties: { value: { type: "string" } },
};

type Call = { url: string; init: RequestInit };

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function completion(content: string, usage?: Record<string, unknown>) {
  return { choices: [{ message: { content } }], ...(usage ? { usage } : {}) };
}

/** Replays the given responses in order; a thrown value simulates a transport failure. */
function scriptedFetch(steps: Array<Response | Error>, calls: Call[]) {
  let index = 0;
  return (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const step = steps[Math.min(index, steps.length - 1)];
    index += 1;
    if (step instanceof Error) throw step;
    return step;
  }) as unknown as typeof fetch;
}

type LogEvent = Record<string, unknown>;

function run(
  steps: Array<Response | Error>,
  options: {
    calls?: Call[];
    logs?: LogEvent[];
    parse?: (value: unknown) => unknown;
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
    userPayload?: unknown;
    systemPrompt?: string;
  } = {},
) {
  const calls = options.calls ?? [];
  const logs = options.logs ?? [];
  return requestAiJson({
    auth: AUTH,
    schemaName: "test_schema",
    schema: SCHEMA,
    systemPrompt: options.systemPrompt ?? "system rules",
    userPayload: options.userPayload ?? { text: "hello" },
    parse:
      options.parse ??
      ((value: unknown) =>
        value && typeof value === "object" && "value" in value ? (value as unknown) : null),
    timeoutMs: options.timeoutMs ?? 50,
    correlationId: "corr-1",
    fetchImpl: options.fetchImpl ?? scriptedFetch(steps, calls),
    logger: (event) => logs.push(event),
  });
}

test("a successful call returns parsed data, usage and one attempt", async () => {
  const calls: Call[] = [];
  const result = await run(
    [
      jsonResponse(
        200,
        completion(JSON.stringify({ value: "ok" }), {
          prompt_tokens: 120,
          completion_tokens: 40,
          total_tokens: 160,
        }),
      ),
    ],
    { calls },
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.data, { value: "ok" });
  assert.deepEqual(result.usage, {
    promptTokens: 120,
    completionTokens: 40,
    totalTokens: 160,
  });
  assert.equal(result.attempts, 1);
  assert.equal(result.correlationId, "corr-1");
  assert.equal(calls.length, 1);
});

test("the request asks for strict json_schema and carries the bearer token", async () => {
  const calls: Call[] = [];
  await run([jsonResponse(200, completion(JSON.stringify({ value: "ok" })))], { calls });
  const call = calls[0];
  assert.ok(call);
  assert.equal(call.url, AUTH.endpoint);
  assert.equal(call.init.method, "POST");
  const headers = call.init.headers as Record<string, string>;
  assert.equal(headers.Authorization, `Bearer ${AUTH.token}`);
  const body = JSON.parse(String(call.init.body));
  assert.equal(body.model, "openai/gpt-5-mini");
  assert.equal(body.stream, false);
  assert.equal(body.response_format.type, "json_schema");
  assert.equal(body.response_format.json_schema.name, "test_schema");
  assert.equal(body.response_format.json_schema.strict, true);
  assert.deepEqual(body.response_format.json_schema.schema, SCHEMA);
  assert.equal(body.messages[0].role, "system");
  assert.equal(body.messages[1].role, "user");
});

test("22. a timeout aborts the request and is not retried", async () => {
  const calls: Call[] = [];
  const hangingFetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    });
  }) as unknown as typeof fetch;

  const result = await run([], { calls, fetchImpl: hangingFetch, timeoutMs: 10 });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "TIMEOUT");
  assert.equal(result.attempts, 1);
  // A paid call is not repeated after the latency budget is spent.
  assert.equal(calls.length, 1);
});

test("23. a 429 is retried exactly once", async () => {
  const calls: Call[] = [];
  const recovered = await run(
    [jsonResponse(429, {}), jsonResponse(200, completion(JSON.stringify({ value: "ok" })))],
    { calls },
  );
  assert.equal(recovered.ok, true);
  if (!recovered.ok) return;
  assert.equal(recovered.attempts, 2);
  assert.equal(calls.length, 2);

  const persistentCalls: Call[] = [];
  const persistent = await run([jsonResponse(429, {})], { calls: persistentCalls });
  assert.equal(persistent.ok, false);
  if (persistent.ok) return;
  assert.equal(persistent.code, "RATE_LIMITED");
  assert.equal(persistent.status, 429);
  assert.equal(persistent.attempts, 2);
  assert.equal(persistentCalls.length, 2);
});

test("24. an ordinary 4xx is not retried", async () => {
  for (const status of [400, 401, 403, 404, 422]) {
    const calls: Call[] = [];
    const result = await run([jsonResponse(status, {})], { calls });
    assert.equal(result.ok, false, String(status));
    if (result.ok) return;
    assert.equal(result.code, "REQUEST_REJECTED");
    assert.equal(result.status, status);
    assert.equal(result.attempts, 1);
    assert.equal(calls.length, 1);
  }
});

test("a 5xx and a network failure are retried once", async () => {
  const serverErrorCalls: Call[] = [];
  const serverError = await run([jsonResponse(503, {})], { calls: serverErrorCalls });
  assert.equal(serverError.ok, false);
  if (serverError.ok) return;
  assert.equal(serverError.code, "PROVIDER_ERROR");
  assert.equal(serverError.attempts, 2);
  assert.equal(serverErrorCalls.length, 2);

  const networkCalls: Call[] = [];
  const network = await run([new Error("ECONNRESET")], { calls: networkCalls });
  assert.equal(network.ok, false);
  if (network.ok) return;
  assert.equal(network.code, "NETWORK");
  assert.equal(network.status, null);
  assert.equal(network.attempts, 2);
  assert.equal(networkCalls.length, 2);
});

test("20. unusable model output is reported as invalid JSON without a retry", async () => {
  const cases: Array<[string, unknown]> = [
    ["not json at all", jsonResponse(200, completion("не JSON, а просто текст"))],
    ["empty content", jsonResponse(200, completion("   "))],
    ["missing choices", jsonResponse(200, { choices: [] })],
  ];
  for (const [label, response] of cases) {
    const calls: Call[] = [];
    const result = await run([response as Response], { calls });
    assert.equal(result.ok, false, label);
    if (result.ok) return;
    assert.equal(result.code, "INVALID_JSON", label);
    assert.equal(result.attempts, 1, label);
    assert.equal(calls.length, 1, label);
  }
});

test("21. output that does not satisfy the caller's parser is a schema mismatch", async () => {
  const calls: Call[] = [];
  const result = await run([jsonResponse(200, completion(JSON.stringify({ other: 1 })))], {
    calls,
    parse: () => null,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "SCHEMA_MISMATCH");
  assert.equal(result.attempts, 1);
  assert.equal(calls.length, 1);
});

test("missing usage is reported as null rather than zeroes", async () => {
  const result = await run([jsonResponse(200, completion(JSON.stringify({ value: "ok" })))]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.usage, null);
});

test("28. logs carry technical metadata only, never secrets, prompt or user text", async () => {
  const logs: LogEvent[] = [];
  await run([jsonResponse(429, {}), jsonResponse(200, completion(JSON.stringify({ value: "ok" })))], {
    logs,
    systemPrompt: "SYSTEM RULES MARKER",
    userPayload: { text: "Нужен сантехник, тел +4915112345678" },
  });
  assert.equal(logs.length, 2);
  const serialized = JSON.stringify(logs);
  for (const forbidden of [AUTH.token, "SYSTEM RULES MARKER", "сантехник", "4915112345678"]) {
    assert.ok(!serialized.includes(forbidden), `${forbidden} leaked into logs`);
  }
  assert.deepEqual(Object.keys(logs[0] ?? {}).sort(), [
    "attempt",
    "correlationId",
    "durationMs",
    "outcome",
    "schema",
    "status",
    "transport",
  ]);
  assert.equal(logs[0]?.outcome, "RATE_LIMITED");
  assert.equal(logs[1]?.outcome, "ok");
});

test("the default timeout is a bounded latency budget", () => {
  assert.equal(typeof AI_JSON_DEFAULT_TIMEOUT_MS, "number");
  assert.ok(AI_JSON_DEFAULT_TIMEOUT_MS > 0 && AI_JSON_DEFAULT_TIMEOUT_MS <= 30_000);
});

test("auth resolution follows the existing gateway, OIDC then OpenAI order", () => {
  const keys = ["AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN", "OPENAI_API_KEY"] as const;
  const saved = keys.map((key) => [key, process.env[key]] as const);
  const clear = () => {
    for (const key of keys) delete process.env[key];
  };

  try {
    clear();
    assert.equal(resolveAiJsonAuth(null), null, "no credentials means no call");

    clear();
    process.env.AI_GATEWAY_API_KEY = "gw";
    process.env.VERCEL_OIDC_TOKEN = "oidc";
    process.env.OPENAI_API_KEY = "sk-test";
    const gateway = resolveAiJsonAuth(null);
    assert.equal(gateway?.transport, "gateway");
    assert.equal(gateway?.token, "gw");
    assert.equal(gateway?.model, "openai/gpt-5-mini");

    clear();
    process.env.VERCEL_OIDC_TOKEN = "oidc";
    process.env.OPENAI_API_KEY = "sk-test";
    const oidc = resolveAiJsonAuth("openai/gpt-5");
    assert.equal(oidc?.transport, "gateway");
    assert.equal(oidc?.token, "oidc");
    assert.equal(oidc?.model, "openai/gpt-5");

    clear();
    process.env.OPENAI_API_KEY = "sk-test";
    const direct = resolveAiJsonAuth("openai/gpt-5-mini");
    assert.equal(direct?.transport, "openai");
    assert.equal(direct?.token, "sk-test");
    // The direct API rejects the gateway prefix.
    assert.equal(direct?.model, "gpt-5-mini");
    assert.equal(resolveAiJsonAuth("   ")?.model, "gpt-4o-mini");
  } finally {
    clear();
    for (const [key, value] of saved) {
      if (value !== undefined) process.env[key] = value;
    }
  }
});
