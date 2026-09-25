import { intentHarness } from "./intentRoute.harness.mjs";

export const AI_JSON_DEFAULT_TIMEOUT_MS = 20_000;

export function resolveAiJsonAuth() {
  return intentHarness.aiAuth;
}

export async function requestAiJson(request) {
  intentHarness.modelCalls.push({
    schemaName: request.schemaName,
    schema: request.schema,
    systemPrompt: request.systemPrompt,
    userPayload: request.userPayload,
    correlationId: request.correlationId,
  });

  const scripted = intentHarness.modelResult;
  if (!scripted) {
    throw new Error("intentHarness.modelResult was not set");
  }
  if (!scripted.ok) {
    return {
      ok: false,
      code: scripted.code,
      status: scripted.status ?? null,
      correlationId: request.correlationId ?? "test",
      attempts: 1,
    };
  }

  const parsed = request.parse(scripted.data);
  if (parsed === null) {
    return {
      ok: false,
      code: "SCHEMA_MISMATCH",
      status: 200,
      correlationId: request.correlationId ?? "test",
      attempts: 1,
    };
  }
  return {
    ok: true,
    data: parsed,
    usage: null,
    correlationId: request.correlationId ?? "test",
    attempts: 1,
  };
}
