import "server-only";

import { randomUUID } from "node:crypto";

/**
 * Shared server-side transport for strict-JSON AI calls.
 *
 * Reuses the authorization schemes already present in this repository:
 * AI Gateway key, Vercel OIDC token, then the direct OpenAI API as fallback.
 * No provider SDK is added: the project already calls these endpoints with fetch.
 *
 * Nothing here logs secrets, prompts, user text or model output.
 */

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

/** Matches the gateway/OpenAI defaults already used by the existing AI modules. */
const DEFAULT_GATEWAY_MODEL = "openai/gpt-5-mini";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export const AI_JSON_DEFAULT_TIMEOUT_MS = 20_000;

export type AiTransport = "gateway" | "openai";

export type AiJsonAuth = {
  token: string;
  endpoint: string;
  model: string;
  transport: AiTransport;
};

export type AiUsage = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

export type AiJsonErrorCode =
  | "AUTH_MISSING"
  | "TIMEOUT"
  | "NETWORK"
  | "RATE_LIMITED"
  | "PROVIDER_ERROR"
  | "REQUEST_REJECTED"
  | "INVALID_JSON"
  | "SCHEMA_MISMATCH";

export type AiJsonResult<T> =
  | { ok: true; data: T; usage: AiUsage | null; correlationId: string; attempts: number }
  | {
      ok: false;
      code: AiJsonErrorCode;
      status: number | null;
      correlationId: string;
      attempts: number;
    };

export type AiJsonRequest<T> = {
  auth: AiJsonAuth;
  /** Stable schema name reported to the provider. */
  schemaName: string;
  /** Strict JSON Schema. Every property must be required with additionalProperties false. */
  schema: Record<string, unknown>;
  systemPrompt: string;
  userPayload: unknown;
  /** Validates and narrows the parsed model object. Returning null means schema mismatch. */
  parse: (value: unknown) => T | null;
  timeoutMs?: number;
  correlationId?: string;
  /** Injected for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Log sink for technical metadata only. */
  logger?: (event: Record<string, unknown>) => void;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: unknown;
    completion_tokens?: unknown;
    total_tokens?: unknown;
  };
};

/**
 * Resolves transport, credentials and model for a strict-JSON call.
 * `modelEnvValue` is the caller's own server-only model variable.
 */
export function resolveAiJsonAuth(modelEnvValue?: string | null): AiJsonAuth | null {
  const configured = modelEnvValue?.trim() || null;

  const gateway = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gateway) {
    return {
      token: gateway,
      endpoint: GATEWAY_URL,
      model: configured || DEFAULT_GATEWAY_MODEL,
      transport: "gateway",
    };
  }

  const oidc = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (oidc) {
    return {
      token: oidc,
      endpoint: GATEWAY_URL,
      model: configured || DEFAULT_GATEWAY_MODEL,
      transport: "gateway",
    };
  }

  const openai = process.env.OPENAI_API_KEY?.trim();
  if (openai) {
    const model = configured || DEFAULT_OPENAI_MODEL;
    return {
      token: openai,
      endpoint: OPENAI_CHAT_URL,
      // The direct OpenAI API does not accept the gateway's `openai/` prefix.
      model: model.startsWith("openai/") ? model.slice("openai/".length) : model,
      transport: "openai",
    };
  }

  return null;
}

function parseUsage(usage: ChatCompletionResponse["usage"]): AiUsage | null {
  if (!usage || typeof usage !== "object") return null;
  const num = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const parsed = {
    promptTokens: num(usage.prompt_tokens),
    completionTokens: num(usage.completion_tokens),
    totalTokens: num(usage.total_tokens),
  };
  if (
    parsed.promptTokens === null &&
    parsed.completionTokens === null &&
    parsed.totalTokens === null
  ) {
    return null;
  }
  return parsed;
}

/**
 * Network failure, 429 and 5xx are transient. Other 4xx and any parsing problem
 * are not. A timeout is not retried either: the latency budget is already spent
 * and a second attempt would double the cost of a paid call.
 */
function isRetryable(code: AiJsonErrorCode): boolean {
  return code === "NETWORK" || code === "RATE_LIMITED" || code === "PROVIDER_ERROR";
}

type AttemptOutcome<T> =
  | { ok: true; data: T; usage: AiUsage | null }
  | { ok: false; code: AiJsonErrorCode; status: number | null };

async function runAttempt<T>(
  request: AiJsonRequest<T>,
  body: string,
  fetchImpl: typeof fetch,
  timeoutMs: number,
): Promise<AttemptOutcome<T>> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(request.auth.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${request.auth.token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body,
      signal: controller.signal,
    });
  } catch {
    return { ok: false, code: timedOut ? "TIMEOUT" : "NETWORK", status: null };
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (response.status === 429) return { ok: false, code: "RATE_LIMITED", status: response.status };
    if (response.status >= 500) return { ok: false, code: "PROVIDER_ERROR", status: response.status };
    return { ok: false, code: "REQUEST_REJECTED", status: response.status };
  }

  let payload: ChatCompletionResponse;
  try {
    payload = (await response.json()) as ChatCompletionResponse;
  } catch {
    return { ok: false, code: "INVALID_JSON", status: response.status };
  }

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    return { ok: false, code: "INVALID_JSON", status: response.status };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false, code: "INVALID_JSON", status: response.status };
  }

  const data = request.parse(parsed);
  if (data === null) {
    return { ok: false, code: "SCHEMA_MISMATCH", status: response.status };
  }

  return { ok: true, data, usage: parseUsage(payload.usage) };
}

/**
 * Performs one strict-JSON chat completion with at most one retry for a
 * transient failure. The prompt and the model output never reach the logs.
 */
export async function requestAiJson<T>(request: AiJsonRequest<T>): Promise<AiJsonResult<T>> {
  const correlationId = request.correlationId?.trim() || randomUUID();
  const fetchImpl = request.fetchImpl ?? fetch;
  const timeoutMs = request.timeoutMs ?? AI_JSON_DEFAULT_TIMEOUT_MS;
  const log = request.logger ?? ((event) => console.info("[ai/json]", event));

  const body = JSON.stringify({
    model: request.auth.model,
    stream: false,
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: JSON.stringify(request.userPayload) },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: request.schemaName,
        strict: true,
        schema: request.schema,
      },
    },
  });

  const maxAttempts = 2;
  let failure: { code: AiJsonErrorCode; status: number | null } = {
    code: "NETWORK",
    status: null,
  };

  for (let attempts = 1; attempts <= maxAttempts; attempts += 1) {
    const startedAt = Date.now();
    const outcome = await runAttempt(request, body, fetchImpl, timeoutMs);
    log({
      correlationId,
      schema: request.schemaName,
      transport: request.auth.transport,
      attempt: attempts,
      durationMs: Date.now() - startedAt,
      outcome: outcome.ok ? "ok" : outcome.code,
      status: outcome.ok ? 200 : outcome.status,
    });

    if (outcome.ok) {
      return { ok: true, data: outcome.data, usage: outcome.usage, correlationId, attempts };
    }

    failure = { code: outcome.code, status: outcome.status };
    if (!isRetryable(outcome.code)) {
      return { ok: false, ...failure, correlationId, attempts };
    }
  }

  return { ok: false, ...failure, correlationId, attempts: maxAttempts };
}
