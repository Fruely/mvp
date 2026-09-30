import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildMatchedServiceRequestOfferIdempotencyKey } from "../leadEngine/requestOfferPolicy.ts";
import { recordServiceRequestClientConfirmation } from "./recordServiceRequestClientConfirmation.ts";

const CLIENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OTHER = "99999999-9999-4999-8999-999999999999";
const SPEC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REQUEST = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MATCH = "11111111-1111-4111-8111-111111111111";
const OFFER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CLAIM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

type Row = Record<string, unknown>;

class Memory {
  readonly tables: Record<string, Row[]>;
  constructor(seed: Record<string, Row[]>) {
    this.tables = {};
    for (const [name, rows] of Object.entries(seed)) this.tables[name] = rows.map((row) => ({ ...row }));
  }
  from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let patch: Row | null = null;
    const rows = () => (this.tables[table] ??= []);
    const matched = () => rows().filter((row) => filters.every((filter) => filter(row)));
    const api = {
      select() { return api; },
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value);
        return api;
      },
      is(column: string, value: unknown) {
        filters.push((row) => (value == null ? row[column] == null : row[column] === value));
        return api;
      },
      update(next: Row) { patch = next; return api; },
      async maybeSingle() {
        if (patch) for (const row of matched()) Object.assign(row, patch);
        const row = matched()[0] ?? null;
        return { data: row ? { ...row } : null, error: null };
      },
      then(resolve: (value: { data: Row[]; error: null }) => unknown, reject?: (reason: unknown) => unknown) {
        if (patch) for (const row of matched()) Object.assign(row, patch);
        return Promise.resolve({ data: matched().map((row) => ({ ...row })), error: null as null }).then(resolve, reject);
      },
    };
    return api;
  }
}

function seed(overrides: { offer?: Row; match?: Row; claim?: Row | null; selected?: string | null } = {}) {
  return new Memory({
    service_requests: [{
      id: REQUEST,
      client_user_id: CLIENT,
      selected_specialist_id: overrides.selected ?? null,
    }],
    service_request_claims: overrides.claim === null ? [] : [{
      id: CLAIM,
      status: "reserved",
      specialist_id: SPEC,
      service_request_id: REQUEST,
      match_id: MATCH,
      request_offer_id: OFFER,
      client_confirmed_at: null,
      ...(overrides.claim ?? {}),
    }],
    request_offers: [{
      id: OFFER,
      request_kind: "service_request",
      offer_reason: "matched",
      service_request_id: REQUEST,
      specialist_id: SPEC,
      billing_model: "pay_per_lead",
      price_cents: 7000,
      currency: "eur",
      idempotency_key: buildMatchedServiceRequestOfferIdempotencyKey({
        requestId: REQUEST,
        specialistId: SPEC,
      }),
      ...(overrides.offer ?? {}),
    }],
    service_request_matches: [{
      id: MATCH,
      service_request_id: REQUEST,
      specialist_id: SPEC,
      status: "active",
      ...(overrides.match ?? {}),
    }],
    request_offer_payments: [],
    request_offer_access_grants: [],
    conversations: [],
  });
}

async function record(db: Memory, userId = CLIENT) {
  return recordServiceRequestClientConfirmation({
    supabase: db as unknown as SupabaseClient,
    requestId: REQUEST,
    clientUserId: userId,
  });
}

test("the owning client can confirm a reserved canonical offer once", async () => {
  const db = seed();
  const first = await record(db);
  const confirmedAt = db.tables.service_request_claims[0]?.client_confirmed_at;
  const second = await record(db);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.equal(first.clientConfirmedAt, confirmedAt);
  assert.equal(second.clientConfirmedAt, confirmedAt);
  assert.equal(db.tables.service_request_claims[0]?.status, "reserved");
  assert.equal(db.tables.request_offer_payments.length, 0);
  assert.equal(db.tables.request_offer_access_grants.length, 0);
  assert.equal(db.tables.conversations.length, 0);
});

test("confirmation rejects the wrong owner, claim, offer, or match", async () => {
  assert.deepEqual(await record(seed(), OTHER), { ok: false, error: "not_found" });
  assert.deepEqual(await record(seed({ claim: null })), { ok: false, error: "not_claimable" });
  assert.deepEqual(
    await record(seed({ claim: { service_request_id: "ffffffff-ffff-4fff-8fff-ffffffffffff" } })),
    { ok: false, error: "not_claimable" },
  );
  assert.deepEqual(
    await record(seed({ offer: { specialist_id: OTHER } })),
    { ok: false, error: "invariant" },
  );
  assert.deepEqual(
    await record(seed({ offer: { request_kind: "direct_lead" } })),
    { ok: false, error: "not_claimable" },
  );
  assert.deepEqual(await record(seed({ offer: { price_cents: 0 } })), { ok: false, error: "invariant" });
  assert.deepEqual(
    await record(seed({ match: { service_request_id: "ffffffff-ffff-4fff-8fff-ffffffffffff" } })),
    { ok: false, error: "not_claimable" },
  );
  assert.deepEqual(await record(seed({ match: { status: "expired" } })), { ok: false, error: "not_claimable" });
  assert.deepEqual(
    await record(seed({ selected: OTHER })),
    { ok: false, error: "already_claimed" },
  );
});
