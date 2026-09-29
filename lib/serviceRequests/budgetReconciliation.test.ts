import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  applyClientBudgetReconciliation,
  clientBudgetReconciliationState,
  openBudgetReconciliationOffer,
  parseBudgetAction,
} from "./budgetReconciliation.ts";

type Row = Record<string, unknown>;

function memory(request: Row) {
  const tables: Record<string, Row[]> = {
    service_requests: [{ ...request }],
    service_request_matches: [],
    specialist_services: [],
    specialists: [],
    native_installations: [],
  };
  const supabase = {
    from(table: string) {
      const filters: Array<(row: Row) => boolean> = [];
      const matched = () => (tables[table] ?? []).filter((row) => filters.every((filter) => filter(row)));
      const query = {
        select() { return query; },
        eq(column: string, value: unknown) {
          filters.push((row) => row[column] === value);
          return query;
        },
        in() { return query; },
        overlaps() { return query; },
        or() { return query; },
        order() { return query; },
        limit() { return query; },
        is() { return query; },
        maybeSingle: async () => ({ data: matched()[0] ? { ...matched()[0] } : null, error: null }),
        update(patch: Row) {
          const chain = {
            eq(column: string, value: unknown) {
              filters.push((row) => row[column] === value);
              return chain;
            },
            then(resolve: (value: { error: null }) => void) {
              for (const row of matched()) Object.assign(row, patch);
              resolve({ error: null });
            },
          };
          return chain;
        },
        upsert: async (payload: Row[]) => {
          if (table === "service_request_matches") {
            for (const row of payload) tables.service_request_matches.push(row);
          }
          return { error: null };
        },
        insert: async () => ({ error: null }),
        then(resolve: (value: { data: Row[]; error: null }) => void) {
          resolve({ data: matched().map((row) => ({ ...row })), error: null });
        },
      };
      return query;
    },
  };
  return { supabase: supabase as unknown as SupabaseClient, tables };
}

const REQUEST = {
  id: "request-1",
  public_id: "REQ-BUDGET",
  client_user_id: "client-1",
  budget_reconciliation_required_cents: 7000,
  budget_reconciliation_accepted_cents: null,
  budget_reconciliation_accepted_at: null,
  budget_reconciliation_declined_at: null,
};

test("a custom amount is rejected and the server floor stays authoritative", () => {
  assert.equal(parseBudgetAction({ action: "accept", amount: 100000 }), null);
  assert.equal(parseBudgetAction({ action: "accept", currency: "eur" }), null);
  assert.equal(parseBudgetAction({ action: "accept" }), "accept");
  assert.equal(parseBudgetAction({ action: "decline" }), "decline");
  const source = readFileSync(new URL("./budgetReconciliation.ts", import.meta.url), "utf8");
  assert.equal(source.includes("amount"), false);
});

test("accept stores the persisted €70 on the same request", async () => {
  const db = memory(REQUEST);
  const result = await applyClientBudgetReconciliation({
    supabase: db.supabase,
    publicId: "REQ-BUDGET",
    clientUserId: "client-1",
    action: "accept",
    nowIso: "2026-09-30T00:00:00.000Z",
    env: {},
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.public_id, "REQ-BUDGET");
  assert.equal(result.accepted_cents, 7000);
  assert.equal(db.tables.service_requests[0].id, "request-1");
  assert.equal(db.tables.service_requests[0].public_id, "REQ-BUDGET");
  assert.equal(db.tables.service_requests[0].budget_reconciliation_accepted_cents, 7000);
  assert.equal(db.tables.service_requests[0].budget_reconciliation_required_cents, null);
  assert.equal(db.tables.service_requests.length, 1);
});

test("repeat accept is idempotent and repeat decline does not distribute", async () => {
  const db = memory(REQUEST);
  const first = await applyClientBudgetReconciliation({
    supabase: db.supabase,
    publicId: "REQ-BUDGET",
    clientUserId: "client-1",
    action: "accept",
    nowIso: "2026-09-30T00:00:00.000Z",
    env: {},
  });
  const second = await applyClientBudgetReconciliation({
    supabase: db.supabase,
    publicId: "REQ-BUDGET",
    clientUserId: "client-1",
    action: "accept",
    nowIso: "2026-09-30T01:00:00.000Z",
    env: {},
  });
  assert.equal(first.ok && second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(second.accepted_cents, 7000);
  assert.equal(db.tables.service_requests[0].budget_reconciliation_accepted_at, "2026-09-30T00:00:00.000Z");
  assert.equal(db.tables.service_requests.length, 1);

  const declinedDb = memory(REQUEST);
  const decline = await applyClientBudgetReconciliation({
    supabase: declinedDb.supabase,
    publicId: "REQ-BUDGET",
    clientUserId: "client-1",
    action: "decline",
    nowIso: "2026-09-30T02:00:00.000Z",
    env: { SERVICE_REQUEST_MATCHING_ENABLED: "true" },
  });
  const declineAgain = await applyClientBudgetReconciliation({
    supabase: declinedDb.supabase,
    publicId: "REQ-BUDGET",
    clientUserId: "client-1",
    action: "decline",
    nowIso: "2026-09-30T03:00:00.000Z",
  });
  assert.equal(decline.ok && declineAgain.ok, true);
  if (!decline.ok || !declineAgain.ok) return;
  assert.equal(decline.matches, 0);
  assert.equal(declineAgain.matches, 0);
  assert.equal(declinedDb.tables.service_request_matches.length, 0);
  assert.equal(declinedDb.tables.service_requests[0].budget_reconciliation_declined_at, "2026-09-30T02:00:00.000Z");
  assert.equal(declinedDb.tables.service_requests[0].status, undefined);
});

test("another user cannot see the request", async () => {
  const db = memory(REQUEST);
  const result = await applyClientBudgetReconciliation({
    supabase: db.supabase,
    publicId: "REQ-BUDGET",
    clientUserId: "someone-else",
    action: "accept",
  });
  assert.deepEqual(result, { ok: false, error: "not_found" });
  assert.equal(db.tables.service_requests[0].budget_reconciliation_required_cents, 7000);
});

test("create and detail expose reconciliation without changing the old fields", () => {
  assert.equal(openBudgetReconciliationOffer({}), null);
  assert.deepEqual(openBudgetReconciliationOffer({
    budget_reconciliation_required_cents: 7000,
    budget_reconciliation_declined_at: null,
  }), { required: true, minimum_budget_cents: 7000, currency: "eur" });
  assert.equal(openBudgetReconciliationOffer({
    budget_reconciliation_required_cents: 7000,
    budget_reconciliation_declined_at: "2026-09-30T00:00:00.000Z",
  }), null);
  assert.deepEqual(clientBudgetReconciliationState({
    budget_reconciliation_required_cents: 7000,
    budget_reconciliation_accepted_cents: null,
    budget_reconciliation_declined_at: null,
  }), {
    required: true,
    minimum_budget_cents: 7000,
    currency: "eur",
    accepted_cents: null,
    declined: false,
  });
  const route = readFileSync(new URL("../../app/api/service-requests/route.ts", import.meta.url), "utf8");
  assert.match(route, /\{ ok: true, public_id:/);
  assert.match(route, /budget_reconciliation/);
});
