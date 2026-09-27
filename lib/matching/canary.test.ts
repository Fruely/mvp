import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyMatchingCanary, MATCHING_CANARY_SPECIALIST_ENV } from "./canary.ts";
import { matchConfirmedServiceRequest } from "./runMatching.ts";
import type { MatchRequest } from "./eligibility.ts";

const CANARY_ID = "55b177ab-d62b-4c65-aa6c-384dad91709e";
const OTHER_ID = "73d0f95e-5959-4ad1-8670-3913fa26e5bc";

const REQUEST: MatchRequest = {
  id: "request-1",
  categoryId: null,
  serviceLanguages: ["ru"],
  workFormat: "online",
  city: null,
  postalCode: null,
};

function specialist(id: string) {
  return {
    id,
    category_id: null,
    languages: ["ru"],
    work_format: "online",
    postal_code: null,
    status: "published_unverified",
    is_active: true,
    is_visible: true,
    billing_visibility_blocked: false,
    is_test: false,
  };
}

function database() {
  const matches = new Map<string, Record<string, unknown>>();
  const supabase = {
    from(table: string) {
      const query = {
        select() { return query; },
        eq() { return query; },
        in() { return query; },
        overlaps() { return query; },
        or() { return query; },
        order() { return query; },
        limit() { return query; },
        maybeSingle: async () => ({ data: { id: "request-1" }, error: null }),
        upsert: async (payload: Record<string, unknown>[]) => {
          for (const row of payload) {
            const key = `${row.service_request_id}:${row.specialist_id}`;
            if (!matches.has(key)) matches.set(key, row);
          }
          return { error: null };
        },
        then(resolve: (value: { data: unknown; error: null }) => void) {
          resolve({
            data: table === "specialists" ? [specialist(CANARY_ID), specialist(OTHER_ID)] : [],
            error: null,
          });
        },
      };
      return query;
    },
  };
  return { supabase: supabase as unknown as SupabaseClient, matches };
}

function envWith(value: string | undefined): NodeJS.ProcessEnv {
  const env = { ...process.env };
  if (value === undefined) delete env[MATCHING_CANARY_SPECIALIST_ENV];
  else env[MATCHING_CANARY_SPECIALIST_ENV] = value;
  return env;
}

async function persistedIds(value: string | undefined): Promise<string[]> {
  const previous = process.env[MATCHING_CANARY_SPECIALIST_ENV];
  if (value === undefined) delete process.env[MATCHING_CANARY_SPECIALIST_ENV];
  else process.env[MATCHING_CANARY_SPECIALIST_ENV] = value;
  const db = database();
  try {
    await matchConfirmedServiceRequest(db.supabase, REQUEST);
  } finally {
    if (previous === undefined) delete process.env[MATCHING_CANARY_SPECIALIST_ENV];
    else process.env[MATCHING_CANARY_SPECIALIST_ENV] = previous;
  }
  const ids: string[] = [];
  db.matches.forEach((row) => {
    ids.push(String(row.specialist_id));
  });
  return ids;
}

test("canary env is parsed only in the canary helper", () => {
  const runtime = [
    "./runMatching.ts",
    "./matchAfterCreate.ts",
    "./featureFlag.ts",
    "../inbox/delivery.ts",
    "../../app/api/cron/match-delivery/route.ts",
    "../../app/api/service-requests/route.ts",
    "../../app/api/v1/agent/service-requests/route.ts",
  ];
  for (const file of runtime) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.equal(source.includes(MATCHING_CANARY_SPECIALIST_ENV), false, file);
  }
  const helper = readFileSync(new URL("./canary.ts", import.meta.url), "utf8");
  assert.equal(helper.includes(MATCHING_CANARY_SPECIALIST_ENV), true);
  assert.equal(helper.includes("process.env"), true);
});

test("A. absent canary env keeps every natural match", async () => {
  const ids = await persistedIds(undefined);
  assert.deepEqual(ids.sort(), [CANARY_ID, OTHER_ID].sort());
});

test("B. a valid canary present in the natural set persists only that specialist", async () => {
  const ids = await persistedIds(CANARY_ID);
  assert.deepEqual(ids, [CANARY_ID]);
});

test("C. a valid canary absent from the natural set persists nothing", async () => {
  const ids = await persistedIds("11111111-1111-4111-8111-111111111111");
  assert.deepEqual(ids, []);
});

test("D-G. empty, whitespace, invalid and multiple canary values persist nothing", async () => {
  for (const value of ["", "   ", "not-a-uuid", `${CANARY_ID},${OTHER_ID}`, `${CANARY_ID} ${OTHER_ID}`, ` ${CANARY_ID} `]) {
    assert.deepEqual(await persistedIds(value), [], value);
  }
});

test("invalid canary config logs no raw env value", () => {
  const secret = "canary-secret-value";
  const logs: unknown[][] = [];
  const original = console.info;
  console.info = (...args: unknown[]) => {
    logs.push(args);
  };
  try {
    const kept = applyMatchingCanary(
      [{ specialist_id: CANARY_ID }, { specialist_id: OTHER_ID }],
      { serviceRequestId: "request-1" },
      envWith(secret),
    );
    assert.deepEqual(kept, []);
  } finally {
    console.info = original;
  }
  const serialized = JSON.stringify(logs);
  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes("matching_canary_invalid_config"), true);
  assert.equal(serialized.includes("matching_canary_active"), false);
});

test("valid canary logs the specialist id and the filtered counts", () => {
  const logs: unknown[][] = [];
  const original = console.info;
  console.info = (...args: unknown[]) => {
    logs.push(args);
  };
  try {
    const kept = applyMatchingCanary(
      [{ specialist_id: CANARY_ID }, { specialist_id: OTHER_ID }],
      { serviceRequestId: "request-1" },
      envWith(CANARY_ID.toUpperCase()),
    );
    assert.deepEqual(kept.map((row) => row.specialist_id), [CANARY_ID]);
  } finally {
    console.info = original;
  }
  assert.deepEqual(logs.map((entry) => entry[0]), [
    "[matching] matching_canary_active",
    "[matching] matching_canary_filtered",
  ]);
  const payload = logs[0][1] as { specialistId: string; beforeCount: number; afterCount: number };
  assert.equal(payload.specialistId, CANARY_ID);
  assert.equal(payload.beforeCount, 2);
  assert.equal(payload.afterCount, 1);
  assert.equal(JSON.stringify(logs).includes(CANARY_ID.toUpperCase()), false);
});
