import {
  checkRateLimitDetailed,
  type RateLimitConfig,
} from "@/lib/rate-limit/shared";

/**
 * Rate limiting for paid AI operations. Unlike the general-purpose limiter this
 * one must not fail open in production: an unreachable or unconfigured limiter
 * would leave a paid endpoint unmetered.
 *
 * The general `checkRateLimit` semantics for every other endpoint stay unchanged.
 */

export type AiRateLimitDecision =
  | { outcome: "allowed" }
  | { outcome: "limited"; retryAfterSec: number }
  | { outcome: "unavailable" };

export type AiRateLimitOptions = {
  configs: RateLimitConfig[];
  /** Defaults to NODE_ENV; only production forbids failing open. */
  environment?: string;
  check?: (config: RateLimitConfig) => Promise<{ outcome: string; retryAfterSec?: number }>;
};

export function isProductionEnvironment(environment?: string): boolean {
  return (environment ?? process.env.NODE_ENV) === "production";
}

/**
 * Applies every configured limit. A single `limited` or an unusable backend in
 * production stops the caller before it spends money.
 */
export async function checkAiRateLimits(
  options: AiRateLimitOptions,
): Promise<AiRateLimitDecision> {
  const check = options.check ?? checkRateLimitDetailed;
  const production = isProductionEnvironment(options.environment);

  for (const config of options.configs) {
    const result = await check(config);
    if (result.outcome === "limited") {
      return { outcome: "limited", retryAfterSec: result.retryAfterSec ?? 60 };
    }
    if (result.outcome === "unavailable") {
      if (production) return { outcome: "unavailable" };
      // Outside production an absent Upstash configuration is expected.
      continue;
    }
  }

  return { outcome: "allowed" };
}
