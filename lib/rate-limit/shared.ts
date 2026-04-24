import { createHash } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { NextRequest } from "next/server";

export type RateLimitConfig = {
  namespace: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec?: number;
};

const MISSING_ENV_WARN =
  "Rate limiting is disabled because Upstash env vars are missing.";

let redisClient: Redis | null = null;
let redisInitAttempted = false;
let missingEnvLogged = false;

const ratelimitCache = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (redisInitAttempted) {
    return redisClient;
  }
  redisInitAttempted = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return null;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

function warnMissingEnvOnce(): void {
  if (missingEnvLogged) return;
  missingEnvLogged = true;
  console.warn(MISSING_ENV_WARN);
}

function getRatelimit(
  namespace: string,
  limit: number,
  windowSeconds: number
): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${namespace}:${limit}:${windowSeconds}`;
  let instance = ratelimitCache.get(cacheKey);
  if (!instance) {
    instance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `freuly:rl:${namespace}`,
    });
    ratelimitCache.set(cacheKey, instance);
  }
  return instance;
}

/**
 * Hash normalized (lowercase trimmed) email for use in rate-limit keys only.
 * Do not log the hash alongside other PII in production logs.
 */
export function hashEmailForRateLimit(normalizedEmail: string): string {
  return createHash("sha256").update(normalizedEmail, "utf8").digest("hex");
}

export function getClientIP(request: NextRequest | Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  return "unknown";
}

/**
 * Sliding-window rate limit via Upstash. Fails open if env is missing or Upstash errors.
 * `request` is reserved for future use (e.g. shared IP helpers); callers pass `identifier` in config.
 */
export async function checkRateLimit(
  _request: NextRequest | Request,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    warnMissingEnvOnce();
    return { allowed: true };
  }

  const ratelimit = getRatelimit(
    config.namespace,
    config.limit,
    config.windowSeconds
  );
  if (!ratelimit) {
    warnMissingEnvOnce();
    return { allowed: true };
  }

  try {
    const result = await ratelimit.limit(config.identifier);
    if (result.success) {
      return { allowed: true };
    }
    const retryAfterSec = Math.max(
      1,
      Math.ceil((result.reset - Date.now()) / 1000)
    );
    return { allowed: false, retryAfterSec };
  } catch (e) {
    console.error("[rate-limit] Upstash request failed", e);
    return { allowed: true };
  }
}

export const RATE_LIMIT_PUBLIC_MESSAGE =
  "Too many requests. Please try again later.";
