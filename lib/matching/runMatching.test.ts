import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { matchAfterServiceRequestCreated } from "./matchAfterCreate.ts";
import { loadMatchedRequests } from "./loadMatchedRequests.ts";
import { matchConfirmedServiceRequest } from "./runMatching.ts";
import type { MatchRequest } from "./eligibility.ts";

const REQUEST: MatchRequest = {
  id: "request-1",
  categoryId: null,
  serviceLanguages: ["ru"],
  workFormat: "online",
  city: null,
  postalCode: null,
};

function specialist(id: string, languages: string[]) {
  return {
    id,
    category_id: null,
    languages,
    work_format: "online",
    postal_code: null,
    status: "published_unverified",
    is_active: true,
    is_visible: true,
    billing_visibility_blocked: false,
    is_test: false,
  };
}

function database(rows = [specialist("specialist-1", ["ru"])]) {
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
          resolve({ data: table === "specialists" ? rows : [], error: null });
        },
      };
      return query;
    },
  };
  return { supabase: supabase as unknown as SupabaseClient, matches };
}

test("19. running matching twice does not create a second row", async () => {
  const db = database();
  await matchConfirmedServiceRequest(db.supabase, REQUEST);
  await matchConfirmedServiceRequest(db.supabase, REQUEST);
  assert.equal(db.matches.size, 1);
});

test("20. concurrent runs keep a single pair", async () => {
  const db = database();
  await Promise.all([
    matchConfirmedServiceRequest(db.supabase, REQUEST),
    matchConfirmedServiceRequest(db.supabase, REQUEST),
  ]);
  assert.equal(db.matches.size, 1);
});

test("22. a match row has no client contact or raw text", async () => {
  const db = database();
  await matchConfirmedServiceRequest(db.supabase, REQUEST);
  let row: Record<string, unknown> | undefined;
  db.matches.forEach((value) => {
    if (!row) row = value;
  });
  if (!row) throw new Error("expected a match row");
  const serialized = JSON.stringify(row);
  for (const forbidden of ["client_email", "client_phone", "client_name", "description", "anna@"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
  assert.deepEqual(row.match_reasons, ["language_match", "format_match", "location_not_required"]);
});

test("23. the specialist card query does not read client contacts", () => {
  const source = readFileSync(new URL("./loadMatchedRequests.ts", import.meta.url), "utf8");
  for (const forbidden of ["client_email", "client_phone", "client_name", "description"]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
});

test("24-25. extraction and clarification do not match", () => {
  const extract = readFileSync(new URL("../../app/api/intent/extract/route.ts", import.meta.url), "utf8");
  const intake = readFileSync(new URL("../serviceIntent/intake.ts", import.meta.url), "utf8");
  assert.equal(extract.includes("matchConfirmedServiceRequest"), false);
  assert.equal(extract.includes("service_request_matches"), false);
  assert.equal(intake.includes("matchConfirmedServiceRequest"), false);
});

test("26. only a newly created request starts matching", async () => {
  let calls = 0;
  const supabase = {
    from() {
      calls += 1;
      return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: null, error: null }) };
    },
  } as unknown as SupabaseClient;
  await matchAfterServiceRequestCreated(
    supabase,
    { kind: "replayed", public_id: "REQ-1", created_at: "2026-09-26T00:00:00.000Z" },
    { work_format: "online", service_languages: [], category_id: null, city: null, postal_code: null } as never,
  );
  assert.equal(calls, 0);
});

test("27-29. public demand, create route and specialist search stay separate", () => {
  const recent = readFileSync(new URL("../../app/api/public/recent-service-requests/route.ts", import.meta.url), "utf8");
  const search = readFileSync(new URL("../search/serviceQueryMatch.ts", import.meta.url), "utf8");
  const create = readFileSync(new URL("../serviceRequests/createServiceRequest.ts", import.meta.url), "utf8");
  assert.equal(recent.includes("service_request_matches"), false);
  assert.equal(search.includes("service_request_matches"), false);
  assert.equal(create.includes("matchConfirmedServiceRequest"), false);
});

test("the migration protects the pair and hides the queue from anon", () => {
  const sql = readFileSync(
    new URL("../../supabase/manual_migrations/2026-09-26_service_request_matches.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /UNIQUE \(service_request_id, specialist_id\)/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /user_id = auth.uid\(\)/);
  assert.match(sql, /REVOKE ALL ON public.service_request_matches FROM anon, authenticated/);
  assert.doesNotMatch(sql, /client_email|client_phone|description/);
});

test("matched request loader returns an error state without throwing", async () => {
  const supabase = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        order() { return this; },
        limit: async () => ({ data: null, error: { message: "unavailable" } }),
      };
    },
  } as unknown as SupabaseClient;
  const model = await loadMatchedRequests(supabase, { specialistId: "specialist-1", lang: "ru" });
  assert.deepEqual(model, { status: "error" });
});
