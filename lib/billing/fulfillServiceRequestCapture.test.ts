import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { processStripeWebhookEventForServiceRequestAuthorization } from "./processServiceRequestAuthorizationWebhook.ts";

const CLIENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SPEC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REQUEST = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MATCH = "11111111-1111-4111-8111-111111111111";
const OFFER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CLAIM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PAYMENT = "12121212-1212-4121-8121-121212121212";

type Row = Record<string, unknown>;

class Memory {
  readonly tables: Record<string, Row[]>;
  failConversations = 0;

  constructor(seed: Record<string, Row[]>) {
    this.tables = {};
    for (const [name, rows] of Object.entries(seed)) this.tables[name] = rows.map((row) => ({ ...row }));
  }

  from(table: string) {
    const db = this;
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
      if (
        table === "request_offer_access_grants" &&
        rows().some((row) => row.offer_id === incoming?.offer_id && row.specialist_id === incoming?.specialist_id)
      ) {
        incoming = null;
        return "conflict" as const;
      }
      const existing = conflict ? rows().find((row) => row[conflict] === incoming?.[conflict]) : undefined;
      if (existing && ignore) {
        const kept = existing;
        incoming = null;
        return kept;
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
      neq(column: string, value: unknown) {
        filters.push((row) => row[column] !== value);
        return api;
      },
      not(column: string, operator: string, value: unknown) {
        if (operator === "is" && value == null) filters.push((row) => row[column] != null);
        return api;
      },
      limit() { return api; },
      order() { return api; },
      like() { return api; },
      update(next: Row) { patch = next; return api; },
      insert(row: Row) { incoming = { id: crypto.randomUUID(), ...row }; return api; },
      upsert(row: Row, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
        incoming = { id: crypto.randomUUID(), ...row };
        ignore = Boolean(options?.ignoreDuplicates);
        conflict = options?.onConflict ?? "";
        return api;
      },
      async maybeSingle() {
        if (table === "conversations" && incoming && db.failConversations > 0) {
          db.failConversations -= 1;
          incoming = null;
          return { data: null, error: { message: "timeout" } };
        }
        const stored = apply();
        if (stored === "conflict") return { data: null, error: { code: "23505" } };
        const row = stored ?? matched()[0] ?? null;
        return { data: row ? { ...row } : null, error: null };
      },
      then(resolve: (value: { data: Row[] | null; error: { code?: string; message?: string } | null }) => unknown, reject?: (reason: unknown) => unknown) {
        if (table === "conversations" && incoming && db.failConversations > 0) {
          db.failConversations -= 1;
          incoming = null;
          return Promise.resolve({ data: null, error: { message: "timeout" } }).then(resolve, reject);
        }
        const stored = apply();
        if (stored === "conflict") {
          return Promise.resolve({ data: null, error: { code: "23505" } }).then(resolve, reject);
        }
        return Promise.resolve({ data: matched().map((row) => ({ ...row })), error: null }).then(resolve, reject);
      },
    };
    return api;
  }
}

function seed() {
  return new Memory({
    service_requests: [{
      id: REQUEST,
      public_id: "REQ-20260929-FULFILL",
      status: "searching",
      selected_specialist_id: null,
      client_user_id: CLIENT,
      client_email: null,
      requested_service: "коуч",
      category_text: null,
    }],
    service_request_matches: [{
      id: MATCH,
      specialist_id: SPEC,
      service_request_id: REQUEST,
      status: "active",
    }],
    service_request_claims: [{
      id: CLAIM,
      specialist_id: SPEC,
      service_request_id: REQUEST,
      match_id: MATCH,
      request_offer_id: OFFER,
      status: "reserved",
      client_confirmed_at: "2026-09-29T18:00:00.000Z",
    }],
    request_offers: [{
      id: OFFER,
      request_kind: "service_request",
      service_request_id: REQUEST,
      specialist_id: SPEC,
      billing_model: "pay_per_lead",
      status: "offered",
      price_cents: 2500,
      currency: "eur",
    }],
    request_offer_payments: [{
      id: PAYMENT,
      offer_id: OFFER,
      specialist_id: SPEC,
      service_request_claim_id: CLAIM,
      amount_cents: 2500,
      currency: "eur",
      status: "authorized",
      stripe_payment_intent_id: "pi_auth",
    }],
    request_offer_access_grants: [],
    conversations: [],
    conversation_messages: [],
    notification_outbox: [],
    inbox_items: [],
    notification_preferences: [],
    push_endpoints: [],
  });
}

function succeeded(): Stripe.Event {
  return {
    id: "evt_paid",
    type: "payment_intent.succeeded",
    data: {
      object: {
        id: "pi_auth",
        object: "payment_intent",
        amount: 2500,
        currency: "eur",
        status: "succeeded",
        metadata: {
          purpose: "service_request_access_authorization",
          payment_id: PAYMENT,
          offer_id: OFFER,
          claim_id: CLAIM,
          specialist_id: SPEC,
        },
      },
    },
  } as unknown as Stripe.Event;
}

test("confirmed capture fulfillment pays, grants, connects, and completes once", async () => {
  const db = seed();
  const first = await processStripeWebhookEventForServiceRequestAuthorization(
    db as unknown as SupabaseClient,
    succeeded(),
  );
  const second = await processStripeWebhookEventForServiceRequestAuthorization(
    db as unknown as SupabaseClient,
    succeeded(),
  );
  assert.deepEqual(first, { outcome: "success" });
  assert.deepEqual(second, { outcome: "success" });
  assert.equal(db.tables.request_offer_payments[0]?.status, "paid");
  assert.equal(db.tables.request_offer_payments[0]?.provider, "stripe");
  assert.equal(db.tables.request_offer_payments[0]?.provider_transaction_id, "pi_auth");
  assert.equal(db.tables.request_offer_payments[0]?.stripe_payment_intent_id, "pi_auth");
  assert.equal(db.tables.request_offers[0]?.price_cents, 2500);
  assert.equal(db.tables.request_offer_access_grants.length, 1);
  assert.equal(db.tables.request_offer_access_grants[0]?.source_payment_id, PAYMENT);
  assert.equal(db.tables.request_offer_access_grants[0]?.revoked_at ?? null, null);
  assert.equal(db.tables.request_offers[0]?.status, "paid");
  assert.equal(db.tables.service_requests[0]?.selected_specialist_id, SPEC);
  assert.equal(db.tables.service_request_claims[0]?.status, "completed");
  assert.equal(db.tables.conversations.length, 1);
  assert.equal(db.tables.conversations[0]?.specialist_id, SPEC);
});

test("a transient connection failure retries without a second grant or conversation", async () => {
  const db = seed();
  db.failConversations = 1;
  const failed = await processStripeWebhookEventForServiceRequestAuthorization(
    db as unknown as SupabaseClient,
    succeeded(),
  );
  assert.deepEqual(failed, { outcome: "retryable_failure" });
  assert.equal(db.tables.request_offer_payments[0]?.status, "paid");
  assert.equal(db.tables.request_offer_access_grants.length, 1);
  assert.equal(db.tables.service_request_claims[0]?.status, "reserved");
  assert.equal(db.tables.conversations.length, 0);

  const repaired = await processStripeWebhookEventForServiceRequestAuthorization(
    db as unknown as SupabaseClient,
    succeeded(),
  );
  assert.deepEqual(repaired, { outcome: "success" });
  assert.equal(db.tables.request_offer_access_grants.length, 1);
  assert.equal(db.tables.conversations.length, 1);
  assert.equal(db.tables.service_request_claims[0]?.status, "completed");
});

test("an existing conversation is reused and a terminal claim is not revived", async () => {
  const db = seed();
  db.tables.service_requests[0].selected_specialist_id = SPEC;
  db.tables.service_request_matches[0].status = "selected";
  db.tables.conversations.push({
    id: "conv-existing",
    service_request_id: REQUEST,
    specialist_id: SPEC,
    client_user_id: CLIENT,
    status: "open",
  });
  db.tables.request_offer_payments[0].status = "paid";
  db.tables.request_offer_access_grants.push({
    id: "grant-existing",
    offer_id: OFFER,
    specialist_id: SPEC,
    source_payment_id: PAYMENT,
    revoked_at: null,
  });
  const repaired = await processStripeWebhookEventForServiceRequestAuthorization(
    db as unknown as SupabaseClient,
    succeeded(),
  );
  assert.deepEqual(repaired, { outcome: "success" });
  assert.equal(db.tables.conversations.length, 1);
  assert.equal(db.tables.conversations[0]?.id, "conv-existing");
  assert.equal(db.tables.service_request_claims[0]?.status, "completed");

  const terminal = seed();
  terminal.tables.service_request_claims[0].status = "released";
  const blocked = await processStripeWebhookEventForServiceRequestAuthorization(
    terminal as unknown as SupabaseClient,
    succeeded(),
  );
  assert.deepEqual(blocked, { outcome: "validation_failed" });
  assert.equal(terminal.tables.service_request_claims[0]?.status, "released");
  assert.equal(terminal.tables.conversations.length, 0);
  assert.equal(terminal.tables.request_offer_access_grants.length, 0);
});

test("a conflicting access grant does not open chat", async () => {
  const db = seed();
  db.tables.request_offer_access_grants.push({
    id: "grant-other",
    offer_id: OFFER,
    specialist_id: SPEC,
    source_payment_id: "abababab-abab-4aba-8aba-abababababab",
    revoked_at: null,
  });
  const result = await processStripeWebhookEventForServiceRequestAuthorization(
    db as unknown as SupabaseClient,
    succeeded(),
  );
  assert.deepEqual(result, { outcome: "validation_failed" });
  assert.equal(db.tables.conversations.length, 0);
  assert.equal(db.tables.service_request_claims[0]?.status, "reserved");
});
