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

function specialist(id: string, languages: string[], userId = `user-${id}`) {
  return {
    id,
    user_id: userId,
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

function database(
  rows = [specialist("specialist-1", ["ru"])],
  installations?: Array<{ user_id: string; active: boolean }>,
) {
  const installs = installations ?? rows.map((row) => ({ user_id: row.user_id, active: true }));
  const matches = new Map<string, Record<string, unknown>>();
  const offers = new Map<string, Record<string, unknown>>();
  const seen: string[] = [];
  const supabase = {
    from(table: string) {
      seen.push(table);
      let idempotencyKey: string | null = null;
      const query = {
        select() { return query; },
        eq(column: string, value: unknown) {
          if (column === "idempotency_key") idempotencyKey = String(value);
          return query;
        },
        in() { return query; },
        overlaps() { return query; },
        or() { return query; },
        order() { return query; },
        limit() { return query; },
        maybeSingle: async () => {
          if (table === "request_offers") {
            const row = idempotencyKey ? offers.get(idempotencyKey) ?? null : null;
            return { data: row, error: null };
          }
          return { data: { id: "request-1" }, error: null };
        },
        insert: async (payload: Record<string, unknown>) => {
          if (table !== "request_offers") return { error: null };
          const key = String(payload.idempotency_key ?? "");
          if (offers.has(key)) return { error: { code: "23505" } };
          offers.set(key, payload);
          return { error: null };
        },
        upsert: async (payload: Record<string, unknown>[]) => {
          for (const row of payload) {
            const key = `${row.service_request_id}:${row.specialist_id}`;
            if (!matches.has(key)) matches.set(key, row);
          }
          return { error: null };
        },
        then(resolve: (value: { data: unknown; error: null }) => void) {
          const data = table === "specialists" ? rows : table === "native_installations" ? installs : [];
          resolve({ data, error: null });
        },
      };
      return query;
    },
  };
  return { supabase: supabase as unknown as SupabaseClient, matches, offers, seen };
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

test("13-18. a new match requires an active native installation and does not require push", async () => {
  const eligible = database();
  await matchConfirmedServiceRequest(eligible.supabase, REQUEST);
  assert.equal(eligible.matches.size, 1);

  const webOnly = database([specialist("specialist-1", ["ru"])], []);
  await matchConfirmedServiceRequest(webOnly.supabase, REQUEST);
  assert.equal(webOnly.matches.size, 0);

  const inactive = database([specialist("specialist-1", ["ru"])], [{ user_id: "user-specialist-1", active: false }]);
  await matchConfirmedServiceRequest(inactive.supabase, REQUEST);
  assert.equal(inactive.matches.size, 0);

  const oneDevice = database(
    [specialist("specialist-1", ["ru"])],
    [
      { user_id: "user-specialist-1", active: false },
      { user_id: "user-specialist-1", active: true },
    ],
  );
  await matchConfirmedServiceRequest(oneDevice.supabase, REQUEST);
  assert.equal(oneDevice.matches.size, 1);

  const none = database(
    [specialist("specialist-1", ["ru"])],
    [
      { user_id: "user-specialist-1", active: false },
      { user_id: "user-specialist-1", active: false },
    ],
  );
  await matchConfirmedServiceRequest(none.supabase, REQUEST);
  assert.equal(none.matches.size, 0);

  const source = readFileSync(new URL("./runMatching.ts", import.meta.url), "utf8");
  assert.equal(source.includes("native_installations"), true);
  assert.equal(source.includes("push_endpoints"), false);
  assert.equal(source.includes("notification_preferences"), false);
  assert.equal(source.includes(".delete("), false);
});

test("19-21. push preference stays out of matching and catalog search is unchanged", () => {
  const matching = readFileSync(new URL("./runMatching.ts", import.meta.url), "utf8");
  const eligibility = readFileSync(new URL("./eligibility.ts", import.meta.url), "utf8");
  const search = readFileSync(new URL("../search/serviceQueryMatch.ts", import.meta.url), "utf8");
  const profile = readFileSync(new URL("../specialistProfile/loadProfile.ts", import.meta.url), "utf8");
  assert.equal(matching.includes("pushEnabled"), false);
  assert.equal(eligibility.includes("native_installations"), false);
  assert.equal(search.includes("native_installations"), false);
  assert.equal(profile.includes("native_installations"), false);
});

const COMMERCIAL = { SERVICE_REQUEST_COMMERCIAL_OFFERS_ENABLED: "true" };

test("commercial offer flag creates one matched service-request offer and retry does not duplicate it", async () => {
  const db = database();
  const first = await matchConfirmedServiceRequest(db.supabase, REQUEST, COMMERCIAL);
  const second = await matchConfirmedServiceRequest(db.supabase, REQUEST, COMMERCIAL);
  assert.equal(first.outcome, "matched");
  assert.equal(second.outcome, "matched");
  assert.equal(db.matches.size, 1);
  assert.equal(db.offers.size, 1);
  const offer = [...db.offers.values()][0];
  assert.equal(offer.request_kind, "service_request");
  assert.equal(offer.lead_id, null);
  assert.equal(offer.service_request_id, REQUEST.id);
  assert.equal(offer.promotion_id, null);
  assert.equal(offer.specialist_id, "specialist-1");
  assert.equal(offer.offer_reason, "matched");
  assert.equal(offer.pricing_segment, "consumer");
  assert.equal(offer.billing_model, "pay_per_lead");
  assert.equal(offer.currency, "eur");
  assert.equal(offer.status, "offered");
  assert.equal(offer.price_cents, null);
  assert.equal(
    offer.idempotency_key,
    "service-request:request-1:specialist:specialist-1:matched:initial",
  );
});

test("commercial offer flag off creates no service-request offer", async () => {
  const db = database();
  const result = await matchConfirmedServiceRequest(db.supabase, REQUEST, {});
  assert.equal(result.outcome, "matched");
  assert.equal(db.matches.size, 1);
  assert.equal(db.offers.size, 0);
});

test("failed commercial offer preparation is reported and not delivered", async () => {
  const db = database();
  const base = db.supabase.from.bind(db.supabase);
  db.supabase.from = ((table: string) => {
    const query = base(table) as { insert?: (payload: Record<string, unknown>) => Promise<unknown> };
    if (table !== "request_offers") return query;
    return { ...query, insert: async () => ({ error: { code: "42501" } }) };
  }) as typeof db.supabase.from;
  const result = await matchConfirmedServiceRequest(db.supabase, REQUEST, COMMERCIAL);
  assert.equal(result.outcome, "error");
  assert.equal(db.offers.size, 0);
  assert.equal(db.seen.filter((table) => table === "service_request_matches").length, 1);
});

test("matched request loader returns an error state without throwing", async () => {
  const supabase = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        in() { return this; },
        order() { return this; },
        limit: async () => ({ data: null, error: { message: "unavailable" } }),
      };
    },
  } as unknown as SupabaseClient;
  const model = await loadMatchedRequests(supabase, { specialistId: "specialist-1", lang: "ru" });
  assert.deepEqual(model, { status: "error" });
});
