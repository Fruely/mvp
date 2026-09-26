import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isServiceIntentExtractionEnabled } from "../serviceIntent/featureFlag.ts";
import { isServiceRequestMatchingEnabled, SERVICE_REQUEST_MATCHING_FLAG } from "./featureFlag.ts";
import { matchAfterServiceRequestCreated } from "./matchAfterCreate.ts";

const VALIDATED = {
  work_format: "online",
  service_languages: ["ru"],
  category_id: null,
  city: null,
  postal_code: null,
} as never;

function database() {
  const writes: string[] = [];
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
        maybeSingle: async () => ({ data: { id: "request-internal-1" }, error: null }),
        upsert: async () => {
          writes.push(table);
          return { error: null };
        },
        then(resolve: (value: { data: unknown; error: null }) => void) {
          resolve({
            data: table === "specialists"
              ? [{
                id: "specialist-1",
                category_id: null,
                languages: ["ru"],
                work_format: "online",
                postal_code: null,
                status: "published_unverified",
                is_active: true,
                is_visible: true,
                billing_visibility_blocked: false,
                is_test: false,
              }]
              : [],
            error: null,
          });
        },
      };
      return query;
    },
  };
  return { supabase: supabase as unknown as SupabaseClient, writes };
}

async function withFlag(value: string | undefined, run: () => Promise<void>) {
  const previous = process.env[SERVICE_REQUEST_MATCHING_FLAG];
  if (value === undefined) delete process.env[SERVICE_REQUEST_MATCHING_FLAG];
  else process.env[SERVICE_REQUEST_MATCHING_FLAG] = value;
  try {
    await run();
  } finally {
    if (previous === undefined) delete process.env[SERVICE_REQUEST_MATCHING_FLAG];
    else process.env[SERVICE_REQUEST_MATCHING_FLAG] = previous;
  }
}

test("1. an absent matching flag disables matching", () => {
  const env = { SERVICE_INTENT_EXTRACTION_ENABLED: "true" };
  assert.equal(isServiceRequestMatchingEnabled(env), false);
});

test("2. flag false creates no match", async () => {
  const db = database();
  const logs: unknown[][] = [];
  const original = console.info;
  console.info = (...args: unknown[]) => {
    logs.push(args);
  };
  try {
    await withFlag("false", async () => {
      await matchAfterServiceRequestCreated(
        db.supabase,
        { kind: "created", public_id: "REQ-1", created_at: "2026-09-26T00:00:00.000Z" },
        VALIDATED,
      );
    });
  } finally {
    console.info = original;
  }
  assert.deepEqual(db.writes, []);
  assert.deepEqual(logs, [[
    "[matching] matching_skipped",
    { reason: "feature_disabled", request_id: "request-internal-1" },
  ]]);
  assert.equal(JSON.stringify(logs).includes("@"), false);
});

test("3. flag true runs matching for the new request", async () => {
  const db = database();
  await withFlag("true", async () => {
    await matchAfterServiceRequestCreated(
      db.supabase,
      { kind: "created", public_id: "REQ-1", created_at: "2026-09-26T00:00:00.000Z" },
      VALIDATED,
    );
  });
  assert.equal(db.writes.includes("service_request_matches"), true);
  const matching = readFileSync(new URL("./runMatching.ts", import.meta.url), "utf8");
  const enqueueAt = matching.lastIndexOf("enqueueMatchNotifications");
  const upsertAt = matching.indexOf('from("service_request_matches")');
  assert.equal(upsertAt > 0 && enqueueAt > upsertAt, true);
});

test("4-5. extraction and matching flags are independent", () => {
  assert.equal(isServiceIntentExtractionEnabled({ SERVICE_REQUEST_MATCHING_ENABLED: "true" }), false);
  assert.equal(isServiceRequestMatchingEnabled({ SERVICE_REQUEST_MATCHING_ENABLED: "true" }), true);
  assert.equal(isServiceIntentExtractionEnabled({ SERVICE_INTENT_EXTRACTION_ENABLED: "true" }), true);
  assert.equal(isServiceRequestMatchingEnabled({ SERVICE_INTENT_EXTRACTION_ENABLED: "true" }), false);
});

test("6. replay does not match again when the flag is on", async () => {
  const db = database();
  await withFlag("true", async () => {
    await matchAfterServiceRequestCreated(
      db.supabase,
      { kind: "replayed", public_id: "REQ-1", created_at: "2026-09-26T00:00:00.000Z" },
      VALIDATED,
    );
  });
  assert.deepEqual(db.writes, []);
});

test("7. web and agent creation share the matching boundary", () => {
  const web = readFileSync(new URL("../../app/api/service-requests/route.ts", import.meta.url), "utf8");
  const agent = readFileSync(new URL("../../app/api/v1/agent/service-requests/route.ts", import.meta.url), "utf8");
  const create = readFileSync(new URL("../serviceRequests/createServiceRequest.ts", import.meta.url), "utf8");
  const intake = readFileSync(new URL("../serviceIntent/intake.ts", import.meta.url), "utf8");
  for (const source of [web, agent]) {
    assert.equal(source.includes("matchAfterServiceRequestCreated"), true);
    assert.equal(source.includes(SERVICE_REQUEST_MATCHING_FLAG), false);
  }
  assert.equal(create.includes(".insert("), true);
  assert.equal(create.includes("matchConfirmedServiceRequest"), false);
  assert.equal(intake.includes("service_requests"), false);
});

test("8. a disabled match writes no inbox or outbox event", async () => {
  const db = database();
  await withFlag(undefined, async () => {
    await matchAfterServiceRequestCreated(
      db.supabase,
      { kind: "created", public_id: "REQ-1", created_at: "2026-09-26T00:00:00.000Z" },
      VALIDATED,
    );
  });
  assert.equal(db.writes.includes("inbox_items"), false);
  assert.equal(db.writes.includes("notification_outbox"), false);
  assert.equal(db.writes.includes("service_request_matches"), false);
});

test("9. enabling the flag does not scan existing requests", () => {
  const boundary = readFileSync(new URL("./matchAfterCreate.ts", import.meta.url), "utf8");
  const cron = readFileSync(new URL("../../app/api/cron/match-delivery/route.ts", import.meta.url), "utf8");
  assert.match(boundary, /result\.kind !== "created"/);
  assert.equal(boundary.includes(".eq(\"public_id\", result.public_id)"), true);
  assert.equal(cron.includes("matchConfirmedServiceRequest"), false);
  assert.equal(cron.includes("matchAfterServiceRequestCreated"), false);
});

test("10. existing delivery does not read the matching flag", () => {
  const cron = readFileSync(new URL("../../app/api/cron/match-delivery/route.ts", import.meta.url), "utf8");
  const delivery = readFileSync(new URL("../inbox/delivery.ts", import.meta.url), "utf8");
  const push = readFileSync(new URL("../push/transport.ts", import.meta.url), "utf8");
  const selection = readFileSync(new URL("../selection/interest.ts", import.meta.url), "utf8");
  for (const source of [cron, delivery, push, selection]) {
    assert.equal(source.includes(SERVICE_REQUEST_MATCHING_FLAG), false);
  }
  assert.equal(cron.includes("deliverPendingOutbox"), true);
  assert.equal(cron.includes("scheduleClientReminders"), true);
  assert.equal(push.includes("EXPO_PUSH_ACCESS_TOKEN"), true);
});

test("preflight and post-migration SQL stay read only", () => {
  for (const name of [
    "../../supabase/manual_migrations/2026-09-26_matching_inbox_push.preflight.sql",
    "../../supabase/manual_migrations/2026-09-26_matching_inbox_push.verify.sql",
  ]) {
    const sql = readFileSync(new URL(name, import.meta.url), "utf8");
    assert.doesNotMatch(sql, /\b(alter|drop|create|insert|update|delete|truncate|grant|revoke)\b/i);
  }
});
