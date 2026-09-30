import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  bindServiceRequestPaymentRail,
  paymentProvesStripeRail,
  type ServiceRequestPaymentRail,
} from "./serviceRequestPaymentRail.ts";

const CLAIM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SPEC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "99999999-9999-4999-8999-999999999999";

type Row = Record<string, unknown>;

function db(claim: Row) {
  const tables = { service_request_claims: [{ ...claim }] };
  return {
    tables,
    from(table: "service_request_claims") {
      const filters: Array<(row: Row) => boolean> = [];
      let patch: Row | null = null;
      const rows = () => tables[table];
      const matched = () => rows().filter((row) => filters.every((filter) => filter(row)));
      const api = {
        select() {
          return api;
        },
        eq(column: string, value: unknown) {
          filters.push((row) => row[column] === value);
          return api;
        },
        is(column: string, value: unknown) {
          filters.push((row) => (value == null ? row[column] == null : row[column] === value));
          return api;
        },
        update(next: Row) {
          patch = next;
          return api;
        },
        maybeSingle: async () => ({ data: matched()[0] ? { ...matched()[0] } : null, error: null }),
        then(resolve: (value: { data: Row[]; error: null }) => void) {
          const winning = matched();
          if (patch) {
            for (const row of winning) Object.assign(row, patch);
          }
          resolve({ data: winning.map((row) => ({ ...row })), error: null });
        },
      };
      return api;
    },
  };
}

function claim(overrides: Row = {}) {
  return {
    id: CLAIM,
    status: "reserved",
    specialist_id: SPEC,
    payment_rail: null,
    ...overrides,
  };
}

async function bind(database: ReturnType<typeof db>, rail: ServiceRequestPaymentRail, specialistId = SPEC) {
  return bindServiceRequestPaymentRail({
    supabase: database as unknown as SupabaseClient,
    claimId: CLAIM,
    specialistId,
    rail,
  });
}

test("a reserved NULL rail binds once and repeats the same rail", async () => {
  const stripe = db(claim());
  assert.deepEqual(await bind(stripe, "stripe"), { ok: true, paymentRail: "stripe" });
  assert.deepEqual(await bind(stripe, "stripe"), { ok: true, paymentRail: "stripe" });
  assert.equal(stripe.tables.service_request_claims[0]?.payment_rail, "stripe");

  const store = db(claim());
  assert.deepEqual(await bind(store, "store"), { ok: true, paymentRail: "store" });
  assert.deepEqual(await bind(store, "store"), { ok: true, paymentRail: "store" });
  assert.equal(store.tables.service_request_claims[0]?.payment_rail, "store");
});

test("a bound rail rejects the other rail, a terminal claim, and the wrong specialist", async () => {
  const stripe = db(claim({ payment_rail: "stripe" }));
  assert.deepEqual(await bind(stripe, "store"), { ok: false, error: "not_claimable" });
  assert.equal(stripe.tables.service_request_claims[0]?.payment_rail, "stripe");

  const store = db(claim({ payment_rail: "store" }));
  assert.deepEqual(await bind(store, "stripe"), { ok: false, error: "not_claimable" });
  assert.equal(store.tables.service_request_claims[0]?.payment_rail, "store");

  for (const status of ["completed", "released", "expired", "failed"]) {
    const terminal = db(claim({ status }));
    assert.deepEqual(await bind(terminal, "stripe"), { ok: false, error: "not_claimable" });
    assert.equal(terminal.tables.service_request_claims[0]?.payment_rail, null);
  }

  const wrong = db(claim());
  assert.deepEqual(await bind(wrong, "store", OTHER), { ok: false, error: "forbidden" });
  assert.equal(wrong.tables.service_request_claims[0]?.payment_rail, null);
});

test("concurrent stripe and store compare-and-set lets one rail win", async () => {
  const database = db(claim());
  const [stripe, store] = await Promise.all([bind(database, "stripe"), bind(database, "store")]);
  const results = [stripe, store];
  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(results.filter((result) => !result.ok && result.error === "not_claimable").length, 1);
  const rail = database.tables.service_request_claims[0]?.payment_rail;
  assert.equal(rail === "stripe" || rail === "store", true);
});

test("only Stripe payment evidence proves the stripe rail", () => {
  assert.equal(paymentProvesStripeRail({ provider: "stripe", stripe_payment_intent_id: null }), true);
  assert.equal(paymentProvesStripeRail({ provider: null, stripe_payment_intent_id: "pi_123" }), true);
  assert.equal(paymentProvesStripeRail({ provider: null, stripe_payment_intent_id: "  " }), false);
  assert.equal(paymentProvesStripeRail({ provider: "apple", stripe_payment_intent_id: null }), false);
});

test("the claim rail migration is additive and backfills only Stripe evidence", () => {
  const sql = readFileSync(
    new URL("../../supabase/manual_migrations/2026-09-30_service_request_claim_payment_rail.sql", import.meta.url),
    "utf8",
  );
  assert.match(sql, /ADD COLUMN IF NOT EXISTS payment_rail text NULL/);
  assert.match(sql, /payment_rail IS NULL OR payment_rail IN \('stripe', 'store'\)/);
  assert.match(sql, /SET payment_rail = 'stripe'/);
  assert.match(sql, /payment\.provider = 'stripe'/);
  assert.match(sql, /stripe_payment_intent_id/);
  assert.doesNotMatch(sql, /payment_rail = 'store'/);
  assert.match(sql, /2026-09-30_request_offer_payment_provider_foundation\.sql/);
});
