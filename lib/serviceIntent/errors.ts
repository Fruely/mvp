/**
 * Stable machine-readable error codes for `POST /api/intent/extract`.
 * Provider messages, prompts, stack traces and secrets never leave the server.
 */
export const SERVICE_INTENT_ERROR_CODES = [
  "feature_disabled",
  "invalid_request",
  "unsupported_locale",
  "invalid_time_zone",
  "rate_limited",
  "rate_limiter_unavailable",
  "ai_unavailable",
  "ai_timeout",
  "invalid_model_response",
  "internal_error",
] as const;

export type ServiceIntentErrorCode = (typeof SERVICE_INTENT_ERROR_CODES)[number];

const STATUS: Record<ServiceIntentErrorCode, number> = {
  feature_disabled: 503,
  invalid_request: 400,
  unsupported_locale: 400,
  invalid_time_zone: 400,
  rate_limited: 429,
  rate_limiter_unavailable: 503,
  ai_unavailable: 503,
  ai_timeout: 504,
  invalid_model_response: 502,
  internal_error: 500,
};

export function serviceIntentErrorStatus(code: ServiceIntentErrorCode): number {
  return STATUS[code];
}
