import assert from "node:assert/strict";
import test from "node:test";

import type { RateLimitConfig } from "@/lib/rate-limit/shared";
import { checkAiRateLimits, isProductionEnvironment } from "./aiRateLimit.ts";

const IP_LIMIT: RateLimitConfig = {
  namespace: "ai:test:ip",
  identifier: "127.0.0.1",
  limit: 20,
  windowSeconds: 3600,
};

const USER_LIMIT: RateLimitConfig = {
  namespace: "ai:test:user",
  identifier: "user-1",
  limit: 60,
  windowSeconds: 3600,
};

function checker(outcomes: Record<string, { outcome: string; retryAfterSec?: number }>) {
  const seen: string[] = [];
  const check = async (config: RateLimitConfig) => {
    seen.push(config.namespace);
    return outcomes[config.namespace] ?? { outcome: "allowed" };
  };
  return { check, seen };
}

test("all configured limits are applied when every one allows", async () => {
  const { check, seen } = checker({});
  const decision = await checkAiRateLimits({
    configs: [IP_LIMIT, USER_LIMIT],
    environment: "production",
    check,
  });
  assert.deepEqual(decision, { outcome: "allowed" });
  assert.deepEqual(seen, ["ai:test:ip", "ai:test:user"]);
});

test("26. an exceeded limit stops before the paid call and reports a retry delay", async () => {
  const { check, seen } = checker({
    "ai:test:ip": { outcome: "limited", retryAfterSec: 120 },
  });
  const decision = await checkAiRateLimits({
    configs: [IP_LIMIT, USER_LIMIT],
    environment: "production",
    check,
  });
  assert.deepEqual(decision, { outcome: "limited", retryAfterSec: 120 });
  // The remaining limits are not consulted once one has tripped.
  assert.deepEqual(seen, ["ai:test:ip"]);
});

test("a limited per-user window is honoured as well, with a default delay", async () => {
  const { check } = checker({ "ai:test:user": { outcome: "limited" } });
  const decision = await checkAiRateLimits({
    configs: [IP_LIMIT, USER_LIMIT],
    environment: "production",
    check,
  });
  assert.deepEqual(decision, { outcome: "limited", retryAfterSec: 60 });
});

test("27. in production an unavailable limiter fails closed", async () => {
  const { check } = checker({ "ai:test:ip": { outcome: "unavailable" } });
  const decision = await checkAiRateLimits({
    configs: [IP_LIMIT, USER_LIMIT],
    environment: "production",
    check,
  });
  assert.deepEqual(decision, { outcome: "unavailable" });
});

test("outside production an unconfigured limiter does not block development", async () => {
  for (const environment of ["development", "test"]) {
    const { check } = checker({
      "ai:test:ip": { outcome: "unavailable" },
      "ai:test:user": { outcome: "unavailable" },
    });
    const decision = await checkAiRateLimits({
      configs: [IP_LIMIT, USER_LIMIT],
      environment,
      check,
    });
    assert.deepEqual(decision, { outcome: "allowed" }, environment);
  }
});

test("a limit still wins over an unavailable backend outside production", async () => {
  const { check } = checker({
    "ai:test:ip": { outcome: "unavailable" },
    "ai:test:user": { outcome: "limited", retryAfterSec: 30 },
  });
  const decision = await checkAiRateLimits({
    configs: [IP_LIMIT, USER_LIMIT],
    environment: "development",
    check,
  });
  assert.deepEqual(decision, { outcome: "limited", retryAfterSec: 30 });
});

test("the environment check falls back to NODE_ENV", async () => {
  assert.equal(isProductionEnvironment("production"), true);
  assert.equal(isProductionEnvironment("development"), false);
  assert.equal(isProductionEnvironment(), process.env.NODE_ENV === "production");
});
