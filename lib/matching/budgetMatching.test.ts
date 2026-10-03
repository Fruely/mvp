import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { matchConfirmedServiceRequest } from "./runMatching.ts";
import type { MatchRequest } from "./eligibility.ts";

const CATEGORY = "22222222-2222-4222-8222-222222222222";

type Row = Record<string, unknown>;

function specialist(id: string, overrides: Row = {}): Row {
  return {
    id,
    user_id: `user-${id}`,
    category_id: CATEGORY,
    languages: ["ru"],
    work_format: "online",
    postal_code: null,
    status: "published_unverified",
    is_active: true,
    is_visible: true,
    billing_visibility_blocked: false,
    is_test: false,
    ...overrides,
  };
}

function requestRow(overrides: Row = {}): Row {
  return {
    id: "request-1",
    client_budget_text: "50 €",
    budget_reconciliation_accepted_cents: null,
    budget_reconciliation_required_cents: null,
    budget_reconciliation_declined_at: null,
    ...overrides,
  };
}

function harness(input: {
  request?: Row;
  specialists: Row[];
  services?: Row[];
  profiles?: Row[];
  offers?: Row[];
}) {
  const request = requestRow(input.request);
  const tables: Record<string, Row[]> = {
    service_requests: [request],
    specialists: input.specialists,
    specialist_services: input.services ?? [],
    specialist_profiles: input.profiles ?? [],
    native_installations: input.specialists.map((row) => ({
      user_id: row.user_id,
      active: true,
      capabilities: ["paid_request_access_v1"],
    })),
    service_request_matches: [],
    request_offers: input.offers ?? [],
    inbox_items: [],
    notification_outbox: [],
  };
  const seen: string[] = [];
  const supabase = {
    from(table: string) {
      seen.push(table);
      const filters: Array<(row: Row) => boolean> = [];
      let idempotencyKey: string | null = null;
      const matched = () => (tables[table] ?? []).filter((row) => filters.every((filter) => filter(row)));
      const query = {
        select() { return query; },
        eq(column: string, value: unknown) {
          if (column === "idempotency_key") idempotencyKey = String(value);
          filters.push((row) => row[column] === value);
          return query;
        },
        in(column: string, values: unknown[]) {
          filters.push((row) => values.includes(row[column]));
          return query;
        },
        is(column: string, value: unknown) {
          filters.push((row) => (value === null ? row[column] == null : row[column] === value));
          return query;
        },
        overlaps() { return query; },
        or() { return query; },
        order() { return query; },
        limit() { return query; },
        maybeSingle: async () => {
          if (table === "request_offers" && idempotencyKey) {
            return { data: tables.request_offers.find((row) => row.idempotency_key === idempotencyKey) ?? null, error: null };
          }
          return { data: matched()[0] ?? null, error: null };
        },
        insert: async (payload: Row) => {
          if (table === "request_offers") {
            if (tables.request_offers.some((row) => row.idempotency_key === payload.idempotency_key)) {
              return { error: { code: "23505" } };
            }
            tables.request_offers.push(payload);
          } else {
            (tables[table] ?? []).push(payload);
          }
          return { error: null };
        },
        update(patch: Row) {
          const chain = {
            eq(column: string, value: unknown) {
              filters.push((row) => row[column] === value);
              return chain;
            },
            is(column: string, value: unknown) {
              filters.push((row) => (value === null ? row[column] == null : row[column] === value));
              return chain;
            },
            select() { return chain; },
            maybeSingle: async () => ({ data: matched()[0] ?? null, error: null }),
            then(resolve: (value: { error: null }) => void) {
              for (const row of matched()) Object.assign(row, patch);
              resolve({ error: null });
            },
          };
          return chain;
        },
        upsert(payload: Row | Row[]) {
          const rows = Array.isArray(payload) ? payload : [payload];
          if (table === "service_request_matches") {
            for (const row of rows) {
              const key = `${row.service_request_id}:${row.specialist_id}`;
              if (!tables.service_request_matches.some((existing) => `${existing.service_request_id}:${existing.specialist_id}` === key)) {
                tables.service_request_matches.push({ id: `match-${tables.service_request_matches.length + 1}`, ...row });
              }
            }
          } else {
            tables[table] = tables[table] ?? [];
            for (const row of rows) tables[table].push({ id: `row-${tables[table].length + 1}`, ...row });
          }
          const stored = rows[0] ? { id: "stored-1", ...rows[0] } : null;
          return {
            select() {
              return { maybeSingle: async () => ({ data: stored, error: null }) };
            },
            then(resolve: (value: { error: null }) => void) {
              resolve({ error: null });
            },
          };
        },
        then(resolve: (value: { data: Row[]; error: null }) => void) {
          resolve({ data: matched(), error: null });
        },
      };
      return query;
    },
  };
  return { supabase: supabase as unknown as SupabaseClient, tables, seen, request };
}

function matchRequest(overrides: Partial<MatchRequest> = {}): MatchRequest {
  return {
    id: "request-1",
    categoryId: CATEGORY,
    serviceLanguages: ["ru"],
    workFormat: "online",
    city: null,
    postalCode: null,
    ...overrides,
  };
}

const COMMERCIAL = { SERVICE_REQUEST_COMMERCIAL_OFFERS_ENABLED: "true" };

test("reconciliation creates no match, no offer, and no specialist notification", async () => {
  const db = harness({
    specialists: [specialist("s70")],
    services: [{ specialist_id: "s70", category_id: CATEGORY, is_active: true, minimum_order_cents: 7000, currency: "EUR" }],
  });
  const result = await matchConfirmedServiceRequest(db.supabase, matchRequest(), COMMERCIAL);
  assert.equal(result.matches, 0);
  assert.equal(result.budgetReconciliation?.minimum_budget_cents, 7000);
  assert.equal(result.budgetReconciliation?.currency, "eur");
  assert.equal(db.tables.service_request_matches.length, 0);
  assert.equal(db.tables.request_offers.length, 0);
  assert.equal(db.seen.includes("inbox_items"), false);
  assert.equal(db.seen.includes("notification_outbox"), false);
  assert.equal(db.request.budget_reconciliation_required_cents, 7000);
  assert.equal(db.request.budget_reconciliation_declined_at, null);
});

test("a passing €40 specialist matches while €70 stays blocked", async () => {
  const db = harness({
    specialists: [specialist("cheap"), specialist("dear")],
    services: [
      { specialist_id: "cheap", category_id: CATEGORY, is_active: true, minimum_order_cents: 4000, currency: "EUR" },
      { specialist_id: "dear", category_id: CATEGORY, is_active: true, minimum_order_cents: 7000, currency: "EUR" },
    ],
  });
  const result = await matchConfirmedServiceRequest(db.supabase, matchRequest(), COMMERCIAL);
  assert.equal(result.budgetReconciliation, null);
  assert.deepEqual(db.tables.service_request_matches.map((row) => row.specialist_id), ["cheap"]);
  assert.equal(db.tables.request_offers.length, 1);
  assert.equal(db.request.budget_reconciliation_required_cents, null);
});

test("geography and language failures do not set the budget floor", async () => {
  const db = harness({
    specialists: [
      specialist("far", { work_format: "offline", city: "Berlin" }),
      specialist("other-language", { languages: ["de"], work_format: "offline" }),
      specialist("local", { work_format: "offline" }),
    ],
    services: [
      { specialist_id: "far", category_id: CATEGORY, is_active: true, minimum_order_cents: 1000, currency: "EUR" },
      { specialist_id: "other-language", category_id: CATEGORY, is_active: true, minimum_order_cents: 2000, currency: "EUR" },
      { specialist_id: "local", category_id: CATEGORY, is_active: true, minimum_order_cents: 7000, currency: "EUR" },
    ],
    profiles: [
      { specialist_id: "far", city: "Berlin" },
      { specialist_id: "other-language", city: "Hamburg" },
      { specialist_id: "local", city: "Hamburg" },
    ],
  });
  const result = await matchConfirmedServiceRequest(db.supabase, matchRequest({
    workFormat: "offline",
    city: "Hamburg",
    serviceLanguages: ["ru"],
  }));
  assert.equal(result.matches, 0);
  assert.equal(result.budgetReconciliation?.minimum_budget_cents, 7000);
  assert.equal(db.tables.service_request_matches.length, 0);
});

test("an accepted ceiling matches the same request and prices a new offer from that ceiling", async () => {
  const db = harness({
    request: {
      client_budget_text: "50 €",
      budget_reconciliation_accepted_cents: 7000,
    },
    specialists: [specialist("s70")],
    services: [{ specialist_id: "s70", category_id: CATEGORY, is_active: true, minimum_order_cents: 7000, currency: "EUR" }],
  });
  const result = await matchConfirmedServiceRequest(db.supabase, matchRequest(), COMMERCIAL);
  assert.equal(result.matches, 1);
  assert.equal(result.budgetReconciliation, null);
  assert.equal(db.tables.service_request_matches.length, 1);
  assert.equal(db.request.id, "request-1");
  const offer = db.tables.request_offers[0];
  assert.equal(offer.estimated_service_value_max_cents, 7000);
  assert.equal(offer.estimated_service_value_min_cents, 7000);
  assert.equal(offer.price_cents, 2500);
});

test("a draft specialist matches by service meaning without a category", async () => {
  const db = harness({
    request: { client_budget_text: "бюджет до 200 евро" },
    specialists: [
      specialist("generator", {
        status: "draft",
        is_active: false,
        is_visible: false,
        category_id: null,
        work_format: "offline",
        postal_code: "57399",
      }),
    ],
    services: [
      {
        specialist_id: "generator",
        category_id: null,
        is_active: true,
        title: "Замена генератора",
        minimum_order_cents: null,
        currency: "EUR",
      },
    ],
    profiles: [{ specialist_id: "generator", city: "Kirchhundem" }],
  });
  const result = await matchConfirmedServiceRequest(
    db.supabase,
    matchRequest({
      categoryId: null,
      meaning: "Замена генератора",
      workFormat: "offline",
      city: "Kirchhundem",
      serviceLanguages: ["ru"],
    }),
  );
  assert.equal(result.matches, 1);
  assert.equal(result.budgetReconciliation, null);
  assert.equal(db.tables.service_request_matches.length, 1);
});

test("an unrelated offer, another work format, another city, or another language does not match", async () => {
  const baseSpecialist = specialist("other", {
    status: "draft",
    is_visible: false,
    category_id: null,
    work_format: "offline",
    postal_code: "10115",
  });
  const request = matchRequest({
    categoryId: null,
    meaning: "Замена генератора",
    workFormat: "offline",
    city: "Kirchhundem",
    postalCode: "57399",
    serviceLanguages: ["ru"],
  });

  const unrelated = harness({
    specialists: [baseSpecialist],
    services: [{ specialist_id: "other", is_active: true, title: "Покраска стен", minimum_order_cents: null, currency: "EUR" }],
    profiles: [{ specialist_id: "other", city: "Kirchhundem" }],
  });
  assert.equal((await matchConfirmedServiceRequest(unrelated.supabase, request)).matches, 0);

  const online = harness({
    specialists: [{ ...baseSpecialist, work_format: "online", postal_code: "57399" }],
    services: [{ specialist_id: "other", is_active: true, title: "Замена генератора", minimum_order_cents: null, currency: "EUR" }],
    profiles: [{ specialist_id: "other", city: "Kirchhundem" }],
  });
  assert.equal((await matchConfirmedServiceRequest(online.supabase, request)).matches, 0);

  const far = harness({
    specialists: [{ ...baseSpecialist, postal_code: "10115" }],
    services: [{ specialist_id: "other", is_active: true, title: "Замена генератора", minimum_order_cents: null, currency: "EUR" }],
    profiles: [{ specialist_id: "other", city: "Berlin" }],
  });
  assert.equal((await matchConfirmedServiceRequest(far.supabase, request)).matches, 0);

  const german = harness({
    specialists: [{ ...baseSpecialist, languages: ["de"], postal_code: "57399" }],
    services: [{ specialist_id: "other", is_active: true, title: "Замена генератора", minimum_order_cents: null, currency: "EUR" }],
    profiles: [{ specialist_id: "other", city: "Kirchhundem" }],
  });
  assert.equal((await matchConfirmedServiceRequest(german.supabase, request)).matches, 0);
});

test("an offer above the stated ceiling is not a normal match", async () => {
  const db = harness({
    request: { client_budget_text: "до 200 евро" },
    specialists: [specialist("dear", { category_id: null })],
    services: [
      {
        specialist_id: "dear",
        category_id: null,
        is_active: true,
        title: "Замена генератора",
        minimum_order_cents: 25000,
        currency: "EUR",
      },
    ],
  });
  const result = await matchConfirmedServiceRequest(
    db.supabase,
    matchRequest({ categoryId: null, meaning: "Замена генератора", serviceLanguages: ["ru"] }),
  );
  assert.equal(result.matches, 0);
  assert.equal(result.budgetReconciliation?.minimum_budget_cents, 25000);
  assert.equal(db.tables.service_request_matches.length, 0);
});

test("a positive existing offer is not repriced from the accepted ceiling", async () => {
  const db = harness({
    request: { budget_reconciliation_accepted_cents: 7000, client_budget_text: "50 €" },
    specialists: [specialist("s70")],
    services: [{ specialist_id: "s70", category_id: CATEGORY, is_active: true, minimum_order_cents: null, currency: "EUR" }],
    offers: [{
      idempotency_key: "service-request:request-1:specialist:s70:matched:initial",
      request_kind: "service_request",
      service_request_id: "request-1",
      specialist_id: "s70",
      offer_reason: "matched",
      billing_model: "pay_per_lead",
      currency: "eur",
      price_cents: 4000,
    }],
  });
  const result = await matchConfirmedServiceRequest(db.supabase, matchRequest(), COMMERCIAL);
  assert.equal(result.outcome, "matched");
  assert.equal(db.tables.request_offers.length, 1);
  assert.equal(db.tables.request_offers[0].price_cents, 4000);
});
