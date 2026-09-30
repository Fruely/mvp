import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildMatchedServiceRequestOfferIdempotencyKey } from "../leadEngine/requestOfferPolicy.ts";
import { PAID_REQUEST_ACCESS_CAPABILITY, PAID_REQUEST_STORE_PURCHASE_CAPABILITY } from "../nativeInstallations/capabilities.ts";
import { prepareServiceRequestStorePayment } from "./prepareServiceRequestStorePayment.ts";

const CLIENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SPEC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SPEC_USER = "88888888-8888-4888-8888-888888888888";
const OTHER = "99999999-9999-4999-8999-999999999999";
const REQUEST = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MATCH = "11111111-1111-4111-8111-111111111111";
const OFFER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CLAIM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const ON = {
  SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true",
  SERVICE_REQUEST_STORE_PAYMENT_ENABLED: "true",
};

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
    let incoming: Row | null = null;
    let ignore = false;
    let conflict = "";
    const rows = () => (this.tables[table] ??= []);
    const matched = () => rows().filter((row) => filters.every((filter) => filter(row)));
    const apply = () => {
      if (patch) for (const row of matched()) Object.assign(row, patch);
      if (!incoming) return null;
      const existing = conflict ? rows().find((row) => row[conflict] === incoming?.[conflict]) : undefined;
      if (existing && ignore) {
        incoming = null;
        return existing;
      }
      if (existing) Object.assign(existing, incoming);
      else rows().push(incoming);
      const stored = existing ?? incoming;
      incoming = null;
      return stored;
    };
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
      in(column: string, values: unknown[]) {
        filters.push((row) => values.includes(row[column]));
        return api;
      },
      like() { return api; },
      limit() { return api; },
      order() { return api; },
      update(next: Row) { patch = next; return api; },
      insert(row: Row) { incoming = { ...row, id: row.id ?? crypto.randomUUID() }; return api; },
      upsert(row: Row, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
        incoming = { ...row, id: row.id ?? crypto.randomUUID() };
        ignore = Boolean(options?.ignoreDuplicates);
        conflict = options?.onConflict ?? "";
        return api;
      },
      async maybeSingle() {
        const stored = apply();
        const row = stored ?? matched()[0] ?? null;
        return { data: row ? { ...row } : null, error: null };
      },
      then(resolve: (value: { data: Row[]; error: null }) => unknown, reject?: (reason: unknown) => unknown) {
        apply();
        return Promise.resolve({ data: matched().map((row) => ({ ...row })), error: null as null }).then(resolve, reject);
      },
    };
    return api;
  }
}

function seed() {
  return new Memory({
    service_request_claims: [{
      id: CLAIM,
      status: "reserved",
      specialist_id: SPEC,
      service_request_id: REQUEST,
      match_id: MATCH,
      request_offer_id: OFFER,
      client_confirmed_at: null,
      payment_rail: null,
    }],
    service_requests: [{
      id: REQUEST,
      public_id: "REQ-STORE",
      client_user_id: CLIENT,
      client_email: "client@example.com",
      locale: "ru",
      requested_service: "коуч",
      selected_specialist_id: null,
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
    }],
    service_request_matches: [{
      id: MATCH,
      service_request_id: REQUEST,
      specialist_id: SPEC,
      status: "active",
    }],
    request_offer_payments: [],
    request_offer_access_grants: [],
    conversations: [],
    specialists: [{ id: SPEC, user_id: SPEC_USER }],
    native_installations: [{
      user_id: SPEC_USER,
      active: true,
      capabilities: [PAID_REQUEST_STORE_PURCHASE_CAPABILITY],
    }],
    inbox_items: [],
    notification_outbox: [],
  });
}

function notices(db: Memory) {
  return db.tables.inbox_items.filter((row) => row.type === "connection_confirmation_required");
}

async function prepare(db: Memory, env: NodeJS.ProcessEnv = ON) {
  return prepareServiceRequestStorePayment({
    supabase: db as unknown as SupabaseClient,
    claimId: CLAIM,
    specialistId: SPEC,
    env,
  });
}

test("store preparation stays closed without both flags and a purchase-ready installation", async () => {
  const paidOff = seed();
  assert.deepEqual(await prepare(paidOff, { SERVICE_REQUEST_STORE_PAYMENT_ENABLED: "true" }), {
    ok: false,
    error: "not_found",
  });
  assert.equal(paidOff.tables.service_request_claims[0]?.payment_rail, null);

  const storeOff = seed();
  assert.deepEqual(await prepare(storeOff, { SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true" }), {
    ok: false,
    error: "not_found",
  });

  for (const capabilities of [[PAID_REQUEST_ACCESS_CAPABILITY], []] as string[][]) {
    const db = seed();
    db.tables.native_installations[0].capabilities = capabilities;
    assert.deepEqual(await prepare(db), { ok: false, error: "not_found" });
    assert.equal(db.tables.service_request_claims[0]?.payment_rail, null);
  }

  const inactive = seed();
  inactive.tables.native_installations[0].active = false;
  assert.deepEqual(await prepare(inactive), { ok: false, error: "not_found" });

  const other = seed();
  other.tables.native_installations[0].user_id = OTHER;
  assert.deepEqual(await prepare(other), { ok: false, error: "not_found" });
  assert.equal(other.tables.request_offer_payments.length, 0);
});

test("store preparation binds the claim and asks the client to confirm once", async () => {
  const db = seed();
  const first = await prepare(db);
  const second = await prepare(db);
  assert.deepEqual(first, { ok: true, state: "awaiting_client_confirmation" });
  assert.deepEqual(second, { ok: true, state: "awaiting_client_confirmation" });
  assert.equal(db.tables.service_request_claims[0]?.payment_rail, "store");
  assert.equal(db.tables.service_request_claims[0]?.status, "reserved");
  assert.equal(db.tables.service_request_claims[0]?.client_confirmed_at, null);
  assert.equal(db.tables.request_offer_payments.length, 0);
  assert.equal(db.tables.request_offer_access_grants.length, 0);
  assert.equal(db.tables.conversations.length, 0);
  assert.equal(notices(db).length, 1);
  assert.equal(notices(db)[0]?.dedupe_key, `claim:${CLAIM}:connection_confirmation_required`);
  assert.equal(JSON.stringify(notices(db)[0]?.payload).includes("pi_"), false);
  assert.equal(JSON.stringify(notices(db)[0]?.payload).includes("client_email"), false);
  assert.equal(db.tables.inbox_items.some((row) => row.type === "client_selected_you"), false);
});

test("an already confirmed store claim does not send another confirmation notice", async () => {
  const db = seed();
  db.tables.service_request_claims[0].client_confirmed_at = "2026-09-30T12:00:00.000Z";
  assert.deepEqual(await prepare(db), { ok: true, state: "payment_required" });
  assert.equal(db.tables.service_request_claims[0]?.payment_rail, "store");
  assert.equal(notices(db).length, 0);
  assert.equal(db.tables.request_offer_payments.length, 0);
  assert.equal(db.tables.request_offer_access_grants.length, 0);
});

test("an active payment, grant, or stripe rail blocks store preparation", async () => {
  for (const status of ["pending", "authorized", "paid"]) {
    const db = seed();
    db.tables.request_offer_payments = [{
      id: "pay-1",
      service_request_claim_id: CLAIM,
      status,
      provider: "stripe",
      stripe_payment_intent_id: "pi_auth",
    }];
    assert.deepEqual(await prepare(db), { ok: false, error: "not_claimable" });
    assert.equal(db.tables.service_request_claims[0]?.payment_rail, null);
    assert.equal(notices(db).length, 0);
  }

  const granted = seed();
  granted.tables.request_offer_access_grants = [{
    id: "grant-1",
    offer_id: OFFER,
    specialist_id: SPEC,
    revoked_at: null,
  }];
  assert.deepEqual(await prepare(granted), { ok: false, error: "not_claimable" });
  assert.equal(granted.tables.service_request_claims[0]?.payment_rail, null);

  const stripe = seed();
  stripe.tables.service_request_claims[0].payment_rail = "stripe";
  assert.deepEqual(await prepare(stripe), { ok: false, error: "not_claimable" });
  assert.equal(stripe.tables.service_request_claims[0]?.payment_rail, "stripe");
  assert.equal(stripe.tables.request_offer_payments.length, 0);
});

test("store prepare route ignores the body and does not purchase", () => {
  const route = readFileSync(
    new URL("../../app/api/specialist/claims/[claimId]/store/prepare/route.ts", import.meta.url),
    "utf8",
  );
  const service = readFileSync(new URL("./prepareServiceRequestStorePayment.ts", import.meta.url), "utf8");
  assert.equal(route.includes("request.json"), false);
  assert.equal(route.includes("session.specialistId"), true);
  assert.equal(service.includes("paymentIntents"), false);
  assert.equal(service.includes("request_offer_payments").valueOf() && service.includes(".insert("), false);
  assert.equal(service.includes("request_offer_access_grants").valueOf() && service.includes('.from("request_offer_access_grants").insert'), false);
});
