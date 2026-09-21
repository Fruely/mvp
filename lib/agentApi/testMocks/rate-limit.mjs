import { agentHarness } from "../testHarness.mjs";

export async function checkRateLimit(_request, config) {
  agentHarness.rateLimitCalls.push(config);
  if (!agentHarness.rateLimitAllowed) {
    return { allowed: false, retryAfterSec: 60 };
  }
  return { allowed: true };
}

export function getClientIP() {
  return "127.0.0.1";
}

export const RATE_LIMIT_PUBLIC_MESSAGE = "Too many requests";
