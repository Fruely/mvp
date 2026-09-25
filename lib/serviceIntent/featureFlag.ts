/**
 * Server-only flag for the intent extraction endpoint. Default off: without an
 * explicit `true` the endpoint never reaches an AI provider.
 *
 * Deliberately not a `NEXT_PUBLIC_*` variable — this controls spend, not UI.
 */
export const SERVICE_INTENT_EXTRACTION_FLAG = "SERVICE_INTENT_EXTRACTION_ENABLED";
export const SERVICE_INTENT_EXTRACTION_MODEL_ENV = "SERVICE_INTENT_EXTRACTION_MODEL";

export function isServiceIntentExtractionEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[SERVICE_INTENT_EXTRACTION_FLAG]?.trim().toLowerCase() === "true";
}

export function serviceIntentExtractionModel(env: NodeJS.ProcessEnv = process.env): string | null {
  return env[SERVICE_INTENT_EXTRACTION_MODEL_ENV]?.trim() || null;
}
