import { intentHarness } from "./intentRoute.harness.mjs";

export async function checkRateLimitDetailed(config) {
  return intentHarness.rateLimit[config.namespace] ?? { outcome: "allowed" };
}

export async function checkRateLimit() {
  return { allowed: true };
}

export function getClientIP(request) {
  return request.headers?.get?.("x-forwarded-for") ?? "127.0.0.1";
}

export const RATE_LIMIT_PUBLIC_MESSAGE = "Too many requests";
