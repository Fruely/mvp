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
  readonly rpcCalls: string[] = [];
  constructor(seed: Record<string, Row[]>) {
    this.tables = {};
    for (const [name, rows] of Object.entries(seed)) this.tables[name] = rows.map((row) => ({ ...row }));
  }
  async rpc(fn: string, args: { p_claim_id?: string; p_decision?: string }) {
    this.rpcCalls.push(fn);
    if (fn !== "apply_service_request_client_decision") return { data: null, error: { message: "unknown rpc" } };
    return { data: decide(this.tables, args.p_claim_id, args.p_decision), error: null };
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

function decide(
  tables: Record<string, Row[]>,
  claimId: string | undefined,
  decision: string | undefined,
): { ok: boolean; at?: string; error?: string } {
  const claim = tables.service_request_claims?.find((row) => row.id === claimId);
  const match = tables.service_request_matches?.find((row) => row.id === claim?.match_id);
  if (!claim || claim.status !== "reserved" || !match || decision !== "confirm") {
    return { ok: false, error: "not_claimable" };
  }
  if (typeof claim.client_confirmed_at === "string" && !claim.client_rejected_at) {
    return { ok: true, at: claim.client_confirmed_at };
  }
  if (claim.client_confirmed_at || claim.client_rejected_at) return { ok: false, error: "not_claimable" };
  if (claim.payment_rail === "store") {
    if (match.status !== "active" && match.status !== "interested") return { ok: false, error: "not_claimable" };
    const at = new Date().toISOString();
    claim.client_confirmed_at = at;
    return { ok: true, at };
  }
  if (claim.payment_rail !== "stripe") return { ok: false, error: "not_claimable" };
  const deadline = typeof claim.confirmation_expires_at === "string" ? Date.parse(claim.confirmation_expires_at) : Number.NaN;
  if (match.status === "expired" || (Number.isFinite(deadline) && deadline <= Date.now())) {
    return { ok: false, error: "confirmation_expired" };
  }
  if (!Number.isFinite(deadline)) return { ok: false, error: "not_claimable" };
  if (match.status !== "active" && match.status !== "interested") return { ok: false, error: "not_claimable" };
  const at = new Date().toISOString();
  claim.client_confirmed_at = at;
  return { ok: true, at };
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
      price_cents: 2500,
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
  const db = seed({ claim: { payment_rail: "store" } });
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
  assert.deepEqual(db.rpcCalls, []);
});

test("stripe confirmation follows the stored deadline and store confirmation does not", async () => {
  const future = seed({
    claim: { payment_rail: "stripe", confirmation_expires_at: "2099-01-01T00:00:00.000Z" },
  });
  const recorded = await record(future);
  assert.equal(recorded.ok, true);
  assert.equal(typeof future.tables.service_request_claims[0]?.client_confirmed_at, "string");
  assert.deepEqual(future.rpcCalls, ["apply_service_request_client_decision"]);

  const elapsed = seed({
    claim: { payment_rail: "stripe", confirmation_expires_at: "2000-01-01T00:00:00.000Z" },
  });
  assert.equal((await record(elapsed)).ok, false);
  assert.equal(elapsed.tables.service_request_claims[0]?.client_confirmed_at, null);

  const missing = seed({ claim: { payment_rail: "stripe", confirmation_expires_at: null } });
  assert.deepEqual(await record(missing), { ok: false, error: "not_claimable" });
  assert.equal(missing.tables.service_request_claims[0]?.client_confirmed_at, null);

  const store = seed({ claim: { payment_rail: "store", confirmation_expires_at: null } });
  const storeRecorded = await record(store);
  assert.equal(storeRecorded.ok, true);
  assert.equal(typeof store.tables.service_request_claims[0]?.client_confirmed_at, "string");
  assert.equal(store.tables.service_request_claims[0]?.status, "reserved");
  assert.equal(store.tables.service_request_matches[0]?.status, "active");
  assert.deepEqual(store.rpcCalls, []);
  assert.equal(store.tables.request_offer_payments.length, 0);

  for (const paymentRail of [null, "card"]) {
    const unknown = seed({ claim: { payment_rail: paymentRail } });
    assert.deepEqual(await record(unknown), { ok: false, error: "not_claimable" });
    assert.equal(unknown.tables.service_request_claims[0]?.client_confirmed_at, null);
    assert.deepEqual(unknown.rpcCalls, []);
  }
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
  assert.deepEqual(await record(seed({ offer: { price_cents: 7000 } })), { ok: false, error: "invariant" });
  assert.deepEqual(await record(seed({ offer: { price_cents: 4000 } })), { ok: false, error: "invariant" });
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
