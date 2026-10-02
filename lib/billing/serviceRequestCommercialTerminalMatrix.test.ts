import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { createServiceRequestAuthorization } from "./createServiceRequestAuthorization.ts";
import {
  confirmServiceRequestConnection,
  serviceRequestCaptureIdempotencyKey,
} from "./confirmServiceRequestConnection.ts";
import {
  expireServiceRequestConfirmation,
  serviceRequestExpiryIdempotencyKey,
} from "./expireServiceRequestConfirmation.ts";
import { processStripeWebhookEventForServiceRequestAuthorization } from "./processServiceRequestAuthorizationWebhook.ts";
import {
  rejectServiceRequestConnection,
  serviceRequestReleaseIdempotencyKey,
} from "./rejectServiceRequestConnection.ts";
import { buildMatchedServiceRequestOfferIdempotencyKey } from "../leadEngine/requestOfferPolicy.ts";
import { reserveOwnMatch } from "../selection/reserveMatch.ts";

/**
 * MP1-S4 terminal-state matrix.
 *
 * States:
 * A reserved + authorized + no client decision
 * B client confirmed / capture pending
 * C connected / paid / claim completed
 * D client rejected / released
 * E confirmation expired / released
 * F failed / incoherent terminal data
 *
 * Actions: confirm, reject, expiry, amount_capturable_updated, canceled,
 * succeeded, authorization retry, reservation retry.
 */

const CLIENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SPEC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "99999999-9999-4999-8999-999999999999";
const REQUEST = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MATCH = "11111111-1111-4111-8111-111111111111";
const OTHER_MATCH = "22222222-2222-4222-8222-222222222222";
const OFFER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CLAIM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PAYMENT = "12121212-1212-4121-8121-121212121212";
const PUBLIC = "REQ-MATRIX-01";
const CONFIRMED_AT = "2026-09-29T18:00:00.000Z";
const REJECTED_AT = "2026-09-29T19:00:00.000Z";
const FUTURE = "2099-01-01T00:00:00.000Z";
const PAST = "2020-01-01T00:00:00.000Z";
const ENV = {
  SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true",
  SERVICE_REQUEST_PAYMENT_AUTH_ENABLED: "true",
  SERVICE_REQUEST_CAPTURE_ENABLED: "true",
  SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: "86400",
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
      lte(column: string, value: unknown) {
        filters.push((row) => row[column] != null && String(row[column]) <= String(value));
        return api;
      },
      gte(column: string, value: unknown) {
        filters.push((row) => row[column] != null && String(row[column]) >= String(value));
        return api;
      },
      gt(column: string, value: unknown) {
        filters.push((row) => row[column] != null && String(row[column]) > String(value));
        return api;
      },
      lt(column: string, value: unknown) {
        filters.push((row) => row[column] != null && String(row[column]) < String(value));
        return api;
      },
      limit() { return api; },
      order() { return api; },
      like() { return api; },
      or() { return api; },
      update(next: Row) { patch = next; return api; },
      insert(row: Row) { incoming = { id: crypto.randomUUID(), ...row }; return api; },
      upsert(row: Row, options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
        incoming = { id: crypto.randomUUID(), ...row };
        ignore = Boolean(options?.ignoreDuplicates);
        conflict = options?.onConflict ?? "";
        return api;
      },
      async maybeSingle() {
        const stored = apply();
        if (stored === "conflict") return { data: null, error: { code: "23505" } };
        const row = stored ?? matched()[0] ?? null;
        return { data: row ? { ...row } : null, error: null };
      },
      async single() {
        const result = await api.maybeSingle();
        if (!result.data) return { data: null, error: { message: "missing" } };
        return result;
      },
      then(resolve: (value: { data: Row[] | null; error: { code?: string; message?: string } | null }) => unknown, reject?: (reason: unknown) => unknown) {
        const stored = apply();
        if (stored === "conflict") {
          return Promise.resolve({ data: null, error: { code: "23505" } }).then(resolve, reject);
        }
        return Promise.resolve({ data: matched().map((row) => ({ ...row })), error: null }).then(resolve, reject);
      },
    };
    return api;
  }

  async rpc(name: string, args: Record<string, unknown>) {
    if (name === "apply_service_request_client_decision") {
      const claim = this.tables.service_request_claims.find((row) => row.id === args.p_claim_id);
      const match = claim
        ? this.tables.service_request_matches.find((row) => row.id === claim.match_id)
        : undefined;
      if (!claim || claim.status !== "reserved" || !match) {
        return { data: { ok: false, error: "not_claimable" }, error: null };
      }
      if (args.p_decision === "confirm" && typeof claim.client_confirmed_at === "string" && !claim.client_rejected_at) {
        return { data: { ok: true, at: claim.client_confirmed_at }, error: null };
      }
      if (args.p_decision === "reject" && typeof claim.client_rejected_at === "string" && !claim.client_confirmed_at) {
        return { data: { ok: true, at: claim.client_rejected_at }, error: null };
      }
      if (claim.client_confirmed_at || claim.client_rejected_at) {
        return { data: { ok: false, error: "not_claimable" }, error: null };
      }
      const deadline = typeof claim.confirmation_expires_at === "string" ? Date.parse(claim.confirmation_expires_at) : Number.NaN;
      if (match.status === "expired" || (Number.isFinite(deadline) && deadline <= Date.now())) {
        return { data: { ok: false, error: "confirmation_expired" }, error: null };
      }
      if (args.p_decision === "confirm" && !Number.isFinite(deadline)) {
        return { data: { ok: false, error: "not_claimable" }, error: null };
      }
      if (match.status !== "active" && match.status !== "interested") {
        return { data: { ok: false, error: "not_claimable" }, error: null };
      }
      const at = new Date().toISOString();
      if (args.p_decision === "confirm") claim.client_confirmed_at = at;
      else if (args.p_decision === "reject") claim.client_rejected_at = at;
      else return { data: { ok: false, error: "not_claimable" }, error: null };
      return { data: { ok: true, at }, error: null };
    }
    if (name === "begin_service_request_confirmation_expiry") {
      const claim = this.tables.service_request_claims.find((row) => row.id === args.p_claim_id);
      const match = claim
        ? this.tables.service_request_matches.find((row) => row.id === claim.match_id)
        : undefined;
      if (
        !claim ||
        claim.payment_rail !== "stripe" ||
        claim.status !== "reserved" ||
        claim.client_confirmed_at ||
        claim.client_rejected_at ||
        !match
      ) {
        return { data: { ok: false, error: "not_eligible" }, error: null };
      }
      if (match.status === "expired") return { data: { ok: true, state: "started" }, error: null };
      if (match.status === "active" || match.status === "interested") {
        match.status = "expired";
        return { data: { ok: true, state: "started" }, error: null };
      }
      return { data: { ok: false, error: "not_eligible" }, error: null };
    }
    if (name === "reserve_service_request_claim") {
      const match = this.tables.service_request_matches.find((row) => row.id === args.p_match_id);
      if (!match || match.status !== "active" || match.specialist_id !== args.p_specialist_id) {
        return { data: { ok: false, error: "not_claimable" }, error: null };
      }
      const live = this.tables.service_request_claims.some((row) =>
        row.service_request_id === match.service_request_id
        && (row.status === "reserved" || row.status === "completed"));
      if (live) return { data: { ok: false, error: "already_claimed" }, error: null };
      return { data: { ok: false, error: "not_claimable" }, error: null };
    }
    return { data: { ok: false, error: "not_claimable" }, error: null };
  }
}

class StripeFake {
  captures: Array<{ id: string; key: string }> = [];
  cancels: Array<{ id: string; key: string; reason: string }> = [];
  creates: string[] = [];
  intentStatus = "requires_capture";
  amount = 2500;

  paymentIntents = {
    retrieve: async (id: string) => this.intent(id, this.intentStatus),
    capture: async (id: string, _params: Record<string, unknown>, options: { idempotencyKey: string }) => {
      if (!this.captures.some((row) => row.key === options.idempotencyKey)) {
        this.captures.push({ id, key: options.idempotencyKey });
      }
      return this.intent(id, "succeeded");
    },
    cancel: async (
      id: string,
      params: { cancellation_reason?: string },
      options: { idempotencyKey: string },
    ) => {
      if (!this.cancels.some((row) => row.key === options.idempotencyKey)) {
        this.cancels.push({
          id,
          key: options.idempotencyKey,
          reason: params.cancellation_reason ?? "",
        });
      }
      this.intentStatus = "canceled";
      return this.intent(id, "canceled");
    },
    create: async (_params: Record<string, unknown>, options: { idempotencyKey: string }) => {
      this.creates.push(options.idempotencyKey);
      return this.intent("pi_new", "requires_confirmation");
    },
  };

  private intent(id: string, status: string) {
    return {
      id,
      amount: this.amount,
      currency: "eur",
      status,
      client_secret: null,
      metadata: {
        purpose: "service_request_access_authorization",
        payment_id: PAYMENT,
        offer_id: OFFER,
        claim_id: CLAIM,
        specialist_id: SPEC,
      },
    };
  }
}

function db(input: {
  claimStatus?: string;
  matchStatus?: string;
  paymentStatus?: string;
  amount?: number;
  rail?: string;
  confirmed?: string | null;
  rejected?: string | null;
  deadline?: string | null;
  reason?: string | null;
  selected?: string | null;
  requestStatus?: string;
}) {
  const amount = input.amount ?? 2500;
  return new Memory({
    service_requests: [{
      id: REQUEST,
      public_id: PUBLIC,
      status: input.requestStatus ?? "searching",
      selected_specialist_id: input.selected ?? null,
      selected_at: input.selected ? CONFIRMED_AT : null,
      client_user_id: CLIENT,
      client_email: "client@example.com",
      requested_service: "коуч",
      category_text: null,
    }],
    service_request_matches: [
      {
        id: MATCH,
        specialist_id: SPEC,
        service_request_id: REQUEST,
        status: input.matchStatus ?? "active",
      },
      {
        id: OTHER_MATCH,
        specialist_id: OTHER,
        service_request_id: REQUEST,
        status: "active",
      },
    ],
    service_request_claims: [{
      id: CLAIM,
      specialist_id: SPEC,
      service_request_id: REQUEST,
      match_id: MATCH,
      request_offer_id: OFFER,
      status: input.claimStatus ?? "reserved",
      payment_rail: input.rail ?? "stripe",
      client_confirmed_at: input.confirmed ?? null,
      client_rejected_at: input.rejected ?? null,
      confirmation_expires_at: input.deadline === undefined ? FUTURE : input.deadline,
      release_reason: input.reason ?? null,
      released_at: input.claimStatus === "released" ? REJECTED_AT : null,
      expired_at: input.claimStatus === "expired" ? PAST : null,
    }],
    request_offers: [{
      id: OFFER,
      request_kind: "service_request",
      offer_reason: "matched",
      service_request_id: REQUEST,
      specialist_id: SPEC,
      billing_model: "pay_per_lead",
      status: "offered",
      price_cents: amount,
      currency: "eur",
      idempotency_key: buildMatchedServiceRequestOfferIdempotencyKey({
        requestId: REQUEST,
        specialistId: SPEC,
      }),
    }],
    request_offer_payments: [{
      id: PAYMENT,
      offer_id: OFFER,
      specialist_id: SPEC,
      user_id: SPEC,
      service_request_claim_id: CLAIM,
      amount_cents: amount,
      currency: "eur",
      status: input.paymentStatus ?? "authorized",
      provider: "stripe",
      stripe_payment_intent_id: "pi_auth",
      provider_transaction_id: "pi_auth",
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

function asDb(memory: Memory): SupabaseClient {
  return memory as unknown as SupabaseClient;
}

function event(type: string, status: string, amount = 2500): Stripe.Event {
  return {
    id: `evt_${type}`,
    type,
    data: {
      object: {
        id: "pi_auth",
        object: "payment_intent",
        amount,
        currency: "eur",
        status,
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

function claimOf(memory: Memory): Row {
  return memory.tables.service_request_claims[0];
}

function paymentOf(memory: Memory): Row {
  return memory.tables.request_offer_payments[0];
}

function otherMatch(memory: Memory): Row {
  const match = memory.tables.service_request_matches.find((row) => row.id === OTHER_MATCH);
  if (!match) throw new Error("missing other match");
  return match;
}

function counts(memory: Memory) {
  return {
    claims: memory.tables.service_request_claims.length,
    payments: memory.tables.request_offer_payments.length,
    offers: memory.tables.request_offers.length,
    grants: memory.tables.request_offer_access_grants.length,
    conversations: memory.tables.conversations.length,
  };
}

function assertNoRematch(memory: Memory) {
  assert.equal(memory.tables.service_request_claims.filter((row) => row.specialist_id === OTHER).length, 0);
  assert.equal(otherMatch(memory).specialist_id, OTHER);
  assert.notEqual(otherMatch(memory).status, "selected");
  assert.equal(memory.tables.request_offers.length, 1);
  assert.equal(memory.tables.request_offer_payments.length, 1);
  assert.equal(memory.tables.service_request_claims.length, 1);
}

function assertPrice(memory: Memory, amount = 2500) {
  assert.equal(paymentOf(memory).amount_cents, amount);
  assert.equal(paymentOf(memory).currency, "eur");
  assert.equal(memory.tables.request_offers[0].price_cents, amount);
}

async function confirm(memory: Memory, stripe: StripeFake) {
  return confirmServiceRequestConnection({
    supabase: asDb(memory),
    publicId: PUBLIC,
    clientUserId: CLIENT,
    env: ENV,
    stripe,
  });
}

async function reject(memory: Memory, stripe: StripeFake) {
  return rejectServiceRequestConnection({
    supabase: asDb(memory),
    publicId: PUBLIC,
    clientUserId: CLIENT,
    env: ENV,
    stripe,
  });
}

async function expire(memory: Memory, stripe: StripeFake) {
  return expireServiceRequestConfirmation({
    supabase: asDb(memory),
    claimId: CLAIM,
    stripe,
  });
}

async function authorize(memory: Memory, stripe: StripeFake) {
  return createServiceRequestAuthorization({
    supabase: asDb(memory),
    claimId: CLAIM,
    specialistId: SPEC,
    userId: SPEC,
    env: ENV,
    stripe,
  });
}

async function reserve(memory: Memory) {
  return reserveOwnMatch(asDb(memory), { matchId: MATCH, specialistId: SPEC }, ENV);
}

async function webhook(memory: Memory, type: string, status: string, amount = 2500) {
  return processStripeWebhookEventForServiceRequestAuthorization(asDb(memory), event(type, status, amount), ENV);
}

test("an open authorization is not fulfilled or expired before a client decision", async () => {
  const memory = db({ deadline: FUTURE });
  const stripe = new StripeFake();

  assert.equal(await expire(memory, stripe), "skipped");
  assert.equal((await webhook(memory, "payment_intent.succeeded", "succeeded")).outcome, "validation_failed");
  assert.equal((await webhook(memory, "payment_intent.amount_capturable_updated", "requires_capture")).outcome, "success");
  const authorized = await authorize(memory, stripe);
  assert.equal(authorized.ok, true);
  if (authorized.ok) assert.equal(authorized.state, "authorized");
  const reserved = await reserve(memory);
  assert.equal(reserved.ok, false);
  if (!reserved.ok) assert.equal(reserved.error, "already_claimed");

  assert.equal(claimOf(memory).status, "reserved");
  assert.equal(claimOf(memory).client_confirmed_at, null);
  assert.equal(claimOf(memory).client_rejected_at, null);
  assert.equal(claimOf(memory).release_reason, null);
  assert.equal(paymentOf(memory).status, "authorized");
  assert.deepEqual(counts(memory), { claims: 1, payments: 1, offers: 1, grants: 0, conversations: 0 });
  assert.equal(stripe.captures.length, 0);
  assert.equal(stripe.cancels.length, 0);
  assert.equal(stripe.creates.length, 0);
  assert.equal(otherMatch(memory).status, "active");
  assertPrice(memory);

  const canceled = db({ deadline: FUTURE });
  assert.equal((await webhook(canceled, "payment_intent.canceled", "canceled")).outcome, "success");
  assert.equal((await webhook(canceled, "payment_intent.canceled", "canceled")).outcome, "success");
  assert.equal(paymentOf(canceled).status, "released");
  assert.equal(claimOf(canceled).status, "reserved");
  assert.equal(claimOf(canceled).release_reason, null);
  assert.equal(claimOf(canceled).client_confirmed_at, null);
  assert.equal(claimOf(canceled).client_rejected_at, null);
  assert.deepEqual(counts(canceled), { claims: 1, payments: 1, offers: 1, grants: 0, conversations: 0 });
  assert.equal(otherMatch(canceled).status, "active");
});

test("capture pending stays one capture until one succeeded webhook connects it", async () => {
  const memory = db({ confirmed: CONFIRMED_AT, deadline: FUTURE });
  const stripe = new StripeFake();

  assert.equal(await expire(memory, stripe), "skipped");
  const rejected = await reject(memory, stripe);
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.equal(rejected.error, "not_claimable");
  const first = await confirm(memory, stripe);
  const second = await confirm(memory, stripe);
  assert.deepEqual(first, { ok: true, state: "capture_pending" });
  assert.deepEqual(second, { ok: true, state: "capture_pending" });
  const authorized = await authorize(memory, stripe);
  assert.equal(authorized.ok, true);
  if (authorized.ok) assert.equal(authorized.state, "authorized");

  assert.equal(claimOf(memory).status, "reserved");
  assert.equal(claimOf(memory).client_confirmed_at, CONFIRMED_AT);
  assert.equal(claimOf(memory).client_rejected_at, null);
  assert.equal(paymentOf(memory).status, "authorized");
  assert.deepEqual(counts(memory), { claims: 1, payments: 1, offers: 1, grants: 0, conversations: 0 });
  assert.deepEqual(stripe.captures, [{ id: "pi_auth", key: serviceRequestCaptureIdempotencyKey(PAYMENT) }]);
  assert.equal(stripe.cancels.length, 0);
  assert.equal(stripe.creates.length, 0);
  assert.equal(otherMatch(memory).status, "active");
  assertPrice(memory);

  assert.equal((await webhook(memory, "payment_intent.succeeded", "succeeded")).outcome, "success");
  assert.equal((await webhook(memory, "payment_intent.succeeded", "succeeded")).outcome, "success");
  assert.equal(claimOf(memory).status, "completed");
  assert.equal(paymentOf(memory).status, "paid");
  assert.equal(memory.tables.service_requests[0].selected_specialist_id, SPEC);
  assert.equal(memory.tables.service_request_matches[0].status, "selected");
  assert.deepEqual(counts(memory), { claims: 1, payments: 1, offers: 1, grants: 1, conversations: 1 });
  assert.equal(stripe.captures.length, 1);

  const settled = {
    claim: claimOf(memory).status,
    reason: claimOf(memory).release_reason ?? null,
    confirmed: claimOf(memory).client_confirmed_at,
    rejected: claimOf(memory).client_rejected_at ?? null,
    payment: paymentOf(memory).status,
    selected: memory.tables.service_requests[0].selected_specialist_id,
    match: memory.tables.service_request_matches[0].status,
    other: otherMatch(memory).status,
    counts: counts(memory),
  };

  const again = await confirm(memory, stripe);
  assert.equal(again.ok, true);
  if (again.ok) assert.equal(again.state, "connected");
  const cannotReject = await reject(memory, stripe);
  assert.equal(cannotReject.ok, false);
  if (!cannotReject.ok) assert.equal(cannotReject.error, "not_claimable");
  assert.equal(await expire(memory, stripe), "skipped");
  assert.equal((await webhook(memory, "payment_intent.canceled", "canceled")).outcome, "validation_failed");
  assert.equal((await webhook(memory, "payment_intent.canceled", "canceled")).outcome, "validation_failed");
  assert.equal((await webhook(memory, "payment_intent.amount_capturable_updated", "requires_capture")).outcome, "success");
  assert.equal((await webhook(memory, "payment_intent.succeeded", "succeeded")).outcome, "success");
  const auth = await authorize(memory, stripe);
  assert.equal(auth.ok, false);
  if (!auth.ok) assert.equal(auth.error, "not_claimable");
  const reserved = await reserve(memory);
  assert.equal(reserved.ok, false);
  if (!reserved.ok) assert.equal(reserved.error, "not_claimable");

  assert.deepEqual({
    claim: claimOf(memory).status,
    reason: claimOf(memory).release_reason ?? null,
    confirmed: claimOf(memory).client_confirmed_at,
    rejected: claimOf(memory).client_rejected_at ?? null,
    payment: paymentOf(memory).status,
    selected: memory.tables.service_requests[0].selected_specialist_id,
    match: memory.tables.service_request_matches[0].status,
    other: otherMatch(memory).status,
    counts: counts(memory),
  }, settled);
  assert.equal(stripe.captures.length, 1);
  assert.equal(stripe.cancels.length, 0);
  assert.equal(stripe.creates.length, 0);
  assertPrice(memory);
  assertNoRematch(memory);
});

test("client rejection stays released under every later action", async () => {
  const memory = db({
    claimStatus: "released",
    matchStatus: "not_selected",
    paymentStatus: "released",
    rejected: REJECTED_AT,
    reason: "client_rejected",
    deadline: PAST,
  });
  const stripe = new StripeFake();
  stripe.intentStatus = "canceled";

  const confirmed = await confirm(memory, stripe);
  assert.equal(confirmed.ok, false);
  if (!confirmed.ok) assert.equal(confirmed.error, "not_claimable");
  assert.deepEqual(await reject(memory, stripe), { ok: true, state: "released" });
  assert.deepEqual(await reject(memory, stripe), { ok: true, state: "released" });
  assert.equal(await expire(memory, stripe), "skipped");
  assert.equal((await webhook(memory, "payment_intent.succeeded", "succeeded")).outcome, "validation_failed");
  assert.equal((await webhook(memory, "payment_intent.amount_capturable_updated", "requires_capture")).outcome, "success");
  assert.equal((await webhook(memory, "payment_intent.canceled", "canceled")).outcome, "success");
  assert.equal((await webhook(memory, "payment_intent.canceled", "canceled")).outcome, "success");
  const auth = await authorize(memory, stripe);
  assert.equal(auth.ok, false);
  if (!auth.ok) assert.equal(auth.error, "not_claimable");
  const reserved = await reserve(memory);
  assert.equal(reserved.ok, false);
  if (!reserved.ok) assert.equal(reserved.error, "not_claimable");

  assert.equal(claimOf(memory).status, "released");
  assert.equal(claimOf(memory).release_reason, "client_rejected");
  assert.equal(claimOf(memory).client_rejected_at, REJECTED_AT);
  assert.equal(claimOf(memory).client_confirmed_at, null);
  assert.equal(paymentOf(memory).status, "released");
  assert.equal(memory.tables.service_request_matches[0].status, "not_selected");
  assert.equal(memory.tables.service_requests[0].selected_specialist_id, null);
  assert.deepEqual(counts(memory), { claims: 1, payments: 1, offers: 1, grants: 0, conversations: 0 });
  assert.equal(stripe.captures.length, 0);
  assert.equal(stripe.cancels.length, 0);
  assert.equal(stripe.creates.length, 0);
  assert.equal(otherMatch(memory).status, "active");
  assertPrice(memory);
  assertNoRematch(memory);
});

test("confirmation expiry stays expired under every later action", async () => {
  const memory = db({
    claimStatus: "expired",
    matchStatus: "expired",
    paymentStatus: "released",
    deadline: PAST,
    reason: "confirmation_expired",
  });
  const stripe = new StripeFake();
  stripe.intentStatus = "canceled";

  const confirmed = await confirm(memory, stripe);
  assert.equal(confirmed.ok, false);
  if (!confirmed.ok) assert.equal(confirmed.error, "not_claimable");
  const rejected = await reject(memory, stripe);
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.equal(rejected.error, "not_claimable");
  assert.equal(await expire(memory, stripe), "expired");
  assert.equal(await expire(memory, stripe), "expired");
  assert.equal((await webhook(memory, "payment_intent.succeeded", "succeeded")).outcome, "validation_failed");
  assert.equal((await webhook(memory, "payment_intent.amount_capturable_updated", "requires_capture")).outcome, "success");
  assert.equal((await webhook(memory, "payment_intent.canceled", "canceled")).outcome, "success");
  assert.equal((await webhook(memory, "payment_intent.canceled", "canceled")).outcome, "success");
  const auth = await authorize(memory, stripe);
  assert.equal(auth.ok, false);
  if (!auth.ok) assert.equal(auth.error, "not_claimable");
  const reserved = await reserve(memory);
  assert.equal(reserved.ok, false);
  if (!reserved.ok) assert.equal(reserved.error, "not_claimable");

  assert.equal(claimOf(memory).status, "expired");
  assert.equal(claimOf(memory).release_reason, "confirmation_expired");
  assert.equal(claimOf(memory).client_confirmed_at, null);
  assert.equal(claimOf(memory).client_rejected_at, null);
  assert.equal(claimOf(memory).released_at, null);
  assert.equal(paymentOf(memory).status, "released");
  assert.equal(memory.tables.service_request_matches[0].status, "expired");
  assert.equal(memory.tables.service_requests[0].selected_specialist_id, null);
  assert.deepEqual(counts(memory), { claims: 1, payments: 1, offers: 1, grants: 0, conversations: 0 });
  assert.equal(stripe.captures.length, 0);
  assert.equal(stripe.cancels.length, 0);
  assert.equal(stripe.creates.length, 0);
  assert.equal(otherMatch(memory).status, "active");
  assertPrice(memory);
  assertNoRematch(memory);
});

test("a canceled provider retry finishes one incomplete client rejection", async () => {
  const memory = db({
    rejected: REJECTED_AT,
    matchStatus: "active",
    paymentStatus: "authorized",
    deadline: FUTURE,
  });
  const stripe = new StripeFake();
  stripe.intentStatus = "canceled";

  assert.deepEqual(await reject(memory, stripe), { ok: true, state: "released" });
  assert.deepEqual(await reject(memory, stripe), { ok: true, state: "released" });
  const auth = await authorize(memory, stripe);
  assert.equal(auth.ok, false);
  if (!auth.ok) assert.equal(auth.error, "not_claimable");
  assert.equal((await webhook(memory, "payment_intent.amount_capturable_updated", "requires_capture")).outcome, "success");

  assert.equal(claimOf(memory).status, "released");
  assert.equal(claimOf(memory).release_reason, "client_rejected");
  assert.equal(paymentOf(memory).status, "released");
  assert.equal(memory.tables.service_request_matches[0].status, "not_selected");
  assert.equal(stripe.cancels.length, 0);
  assert.equal(stripe.creates.length, 0);
  assert.notEqual(claimOf(memory).release_reason, "confirmation_expired");
  assert.equal(otherMatch(memory).status, "active");
  assertNoRematch(memory);
});

test("a canceled provider retry finishes one incomplete confirmation expiry", async () => {
  const memory = db({
    matchStatus: "expired",
    paymentStatus: "authorized",
    deadline: PAST,
  });
  const stripe = new StripeFake();
  stripe.intentStatus = "canceled";

  assert.equal(await expire(memory, stripe), "expired");
  assert.equal(await expire(memory, stripe), "expired");
  const auth = await authorize(memory, stripe);
  assert.equal(auth.ok, false);
  if (!auth.ok) assert.equal(auth.error, "not_claimable");
  assert.equal((await webhook(memory, "payment_intent.amount_capturable_updated", "requires_capture")).outcome, "success");
  const reserved = await reserve(memory);
  assert.equal(reserved.ok, false);
  if (!reserved.ok) assert.equal(reserved.error, "not_claimable");

  assert.equal(claimOf(memory).status, "expired");
  assert.equal(claimOf(memory).release_reason, "confirmation_expired");
  assert.equal(claimOf(memory).client_confirmed_at, null);
  assert.equal(claimOf(memory).client_rejected_at, null);
  assert.equal(paymentOf(memory).status, "released");
  assert.equal(memory.tables.service_request_matches[0].status, "expired");
  assert.equal(stripe.cancels.length, 0);
  assert.equal(stripe.creates.length, 0);
  assert.equal(otherMatch(memory).status, "active");
  assertNoRematch(memory);
});

test("a released payment and a closed match are not reopened before claim terminalization", async () => {
  const rejected = db({
    rejected: REJECTED_AT,
    matchStatus: "not_selected",
    paymentStatus: "released",
    deadline: PAST,
  });
  const rejectedStripe = new StripeFake();
  rejectedStripe.intentStatus = "canceled";
  assert.deepEqual(await reject(rejected, rejectedStripe), { ok: true, state: "released" });
  const rejectedAuth = await authorize(rejected, rejectedStripe);
  assert.equal(rejectedAuth.ok, false);
  if (!rejectedAuth.ok) assert.equal(rejectedAuth.error, "not_claimable");
  assert.equal((await webhook(rejected, "payment_intent.amount_capturable_updated", "requires_capture")).outcome, "success");
  assert.equal(claimOf(rejected).status, "released");
  assert.equal(claimOf(rejected).release_reason, "client_rejected");
  assert.equal(paymentOf(rejected).status, "released");
  assert.equal(rejected.tables.service_request_matches[0].status, "not_selected");
  assert.equal(rejectedStripe.creates.length, 0);
  assert.equal(rejectedStripe.cancels.length, 0);

  const expired = db({
    matchStatus: "expired",
    paymentStatus: "released",
    deadline: PAST,
  });
  const expiredStripe = new StripeFake();
  expiredStripe.intentStatus = "canceled";
  assert.equal(await expire(expired, expiredStripe), "expired");
  const expiredAuth = await authorize(expired, expiredStripe);
  assert.equal(expiredAuth.ok, false);
  if (!expiredAuth.ok) assert.equal(expiredAuth.error, "not_claimable");
  assert.equal((await webhook(expired, "payment_intent.amount_capturable_updated", "requires_capture")).outcome, "success");
  const reserved = await reserve(expired);
  assert.equal(reserved.ok, false);
  if (!reserved.ok) assert.equal(reserved.error, "not_claimable");
  assert.equal(claimOf(expired).status, "expired");
  assert.equal(claimOf(expired).release_reason, "confirmation_expired");
  assert.equal(paymentOf(expired).status, "released");
  assert.equal(expired.tables.service_request_matches[0].status, "expired");
  assert.equal(expiredStripe.creates.length, 0);
  assert.equal(expiredStripe.cancels.length, 0);
  assertNoRematch(rejected);
  assertNoRematch(expired);
});

test("a paid but unfinished confirmation is fulfilled once by the succeeded webhook", async () => {
  const memory = db({
    confirmed: CONFIRMED_AT,
    paymentStatus: "paid",
    deadline: FUTURE,
  });
  const stripe = new StripeFake();
  stripe.intentStatus = "succeeded";

  assert.equal(await expire(memory, stripe), "skipped");
  const rejected = await reject(memory, stripe);
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.equal(rejected.error, "not_claimable");
  assert.equal((await webhook(memory, "payment_intent.succeeded", "succeeded")).outcome, "success");
  assert.equal((await webhook(memory, "payment_intent.succeeded", "succeeded")).outcome, "success");
  const again = await confirm(memory, stripe);
  assert.equal(again.ok, true);
  if (again.ok) assert.equal(again.state, "connected");

  assert.equal(claimOf(memory).status, "completed");
  assert.equal(paymentOf(memory).status, "paid");
  assert.deepEqual(counts(memory), { claims: 1, payments: 1, offers: 1, grants: 1, conversations: 1 });
  assert.equal(stripe.captures.length, 0);
  assert.equal(stripe.cancels.length, 0);
  assertPrice(memory);
  assertNoRematch(memory);
});

test("a non-canonical amount fails closed and is not rewritten to 2500", async () => {
  const elapsed = db({
    amount: 7000,
    deadline: PAST,
    matchStatus: "active",
  });
  const elapsedStripe = new StripeFake();
  elapsedStripe.amount = 7000;
  assert.equal(await expire(elapsed, elapsedStripe), "invariant");
  const elapsedConfirm = await confirm(elapsed, elapsedStripe);
  assert.equal(elapsedConfirm.ok, false);
  if (!elapsedConfirm.ok) assert.equal(elapsedConfirm.error, "confirmation_expired");
  const elapsedReject = await reject(elapsed, elapsedStripe);
  assert.equal(elapsedReject.ok, false);
  if (!elapsedReject.ok) assert.equal(elapsedReject.error, "invariant");
  assert.equal((await webhook(elapsed, "payment_intent.succeeded", "succeeded", 7000)).outcome, "validation_failed");
  assert.equal((await webhook(elapsed, "payment_intent.amount_capturable_updated", "requires_capture", 7000)).outcome, "validation_failed");
  assert.equal((await webhook(elapsed, "payment_intent.canceled", "canceled", 7000)).outcome, "validation_failed");
  assert.equal(claimOf(elapsed).status, "reserved");
  assert.equal(claimOf(elapsed).release_reason, null);
  assert.equal(claimOf(elapsed).client_confirmed_at, null);
  assert.equal(claimOf(elapsed).client_rejected_at, null);
  assert.equal(paymentOf(elapsed).status, "authorized");
  assert.equal(paymentOf(elapsed).amount_cents, 7000);
  assert.equal(elapsed.tables.request_offers[0].price_cents, 7000);
  assert.deepEqual(counts(elapsed), { claims: 1, payments: 1, offers: 1, grants: 0, conversations: 0 });
  assert.equal(elapsedStripe.captures.length, 0);
  assert.equal(elapsedStripe.cancels.length, 0);
  assert.equal(elapsedStripe.creates.length, 0);
  assert.equal(otherMatch(elapsed).status, "active");

  const open = db({
    amount: 7000,
    deadline: FUTURE,
    matchStatus: "active",
  });
  const openStripe = new StripeFake();
  openStripe.amount = 7000;
  const openConfirm = await confirm(open, openStripe);
  assert.equal(openConfirm.ok, false);
  if (!openConfirm.ok) assert.equal(openConfirm.error, "invariant");
  assert.equal(claimOf(open).status, "reserved");
  assert.equal(claimOf(open).client_confirmed_at, null);
  assert.equal(paymentOf(open).status, "authorized");
  assert.equal(paymentOf(open).amount_cents, 7000);
  assert.equal(openStripe.captures.length, 0);
  assert.equal(openStripe.cancels.length, 0);
});

test("stripe terminal events do not apply stripe product terminals to a store claim", async () => {
  const canceled = db({ rail: "store", deadline: null });
  assert.equal((await webhook(canceled, "payment_intent.canceled", "canceled")).outcome, "success");
  assert.equal(claimOf(canceled).status, "reserved");
  assert.equal(claimOf(canceled).payment_rail, "store");
  assert.equal(claimOf(canceled).release_reason, null);
  assert.equal(claimOf(canceled).client_confirmed_at, null);
  assert.equal(claimOf(canceled).client_rejected_at, null);
  assert.equal(paymentOf(canceled).status, "released");
  assert.deepEqual(counts(canceled), { claims: 1, payments: 1, offers: 1, grants: 0, conversations: 0 });

  const succeeded = db({ rail: "store", deadline: null });
  assert.equal((await webhook(succeeded, "payment_intent.succeeded", "succeeded")).outcome, "validation_failed");
  assert.equal(claimOf(succeeded).status, "reserved");
  assert.equal(claimOf(succeeded).payment_rail, "store");
  assert.equal(paymentOf(succeeded).status, "authorized");
  assert.equal(counts(succeeded).grants, 0);
  assert.equal(counts(succeeded).conversations, 0);

  const capturable = db({ rail: "store", deadline: PAST });
  assert.equal((await webhook(capturable, "payment_intent.amount_capturable_updated", "requires_capture")).outcome, "success");
  assert.equal(claimOf(capturable).status, "reserved");
  assert.equal(claimOf(capturable).payment_rail, "store");
  assert.equal(claimOf(capturable).release_reason, null);
  assert.equal(paymentOf(capturable).status, "authorized");

  const worker = db({ rail: "store", deadline: PAST });
  const stripe = new StripeFake();
  assert.equal(await expire(worker, stripe), "skipped");
  const rejected = await reject(worker, stripe);
  assert.equal(rejected.ok, false);
  if (!rejected.ok) assert.equal(rejected.error, "not_claimable");
  assert.equal(claimOf(worker).status, "reserved");
  assert.equal(claimOf(worker).payment_rail, "store");
  assert.equal(claimOf(worker).release_reason, null);
  assert.equal(paymentOf(worker).status, "authorized");
  assert.equal(stripe.cancels.length, 0);
  assert.equal(stripe.captures.length, 0);
});

test("rejection and expiry reasons are not interchangeable", async () => {
  const rejected = db({
    claimStatus: "released",
    matchStatus: "not_selected",
    paymentStatus: "released",
    rejected: REJECTED_AT,
    reason: "client_rejected",
    deadline: PAST,
  });
  assert.equal((await webhook(rejected, "payment_intent.canceled", "canceled")).outcome, "success");
  assert.equal(await expire(rejected, new StripeFake()), "skipped");
  assert.equal(claimOf(rejected).status, "released");
  assert.equal(claimOf(rejected).release_reason, "client_rejected");

  const expired = db({
    claimStatus: "expired",
    matchStatus: "expired",
    paymentStatus: "released",
    deadline: PAST,
    reason: "confirmation_expired",
  });
  assert.equal((await webhook(expired, "payment_intent.canceled", "canceled")).outcome, "success");
  const rejectedLater = await reject(expired, new StripeFake());
  assert.equal(rejectedLater.ok, false);
  if (!rejectedLater.ok) assert.equal(rejectedLater.error, "not_claimable");
  assert.equal(claimOf(expired).status, "expired");
  assert.equal(claimOf(expired).release_reason, "confirmation_expired");
  assert.equal(claimOf(expired).client_rejected_at, null);
});

test("release and expiry cancellations keep distinct idempotency keys", async () => {
  const rejected = db({ rejected: null, deadline: FUTURE });
  const rejectStripe = new StripeFake();
  assert.deepEqual(await reject(rejected, rejectStripe), { ok: true, state: "released" });
  assert.deepEqual(rejectStripe.cancels, [{
    id: "pi_auth",
    key: serviceRequestReleaseIdempotencyKey(PAYMENT),
    reason: "requested_by_customer",
  }]);

  const expired = db({ deadline: PAST });
  const expireStripe = new StripeFake();
  assert.equal(await expire(expired, expireStripe), "expired");
  assert.deepEqual(expireStripe.cancels, [{
    id: "pi_auth",
    key: serviceRequestExpiryIdempotencyKey(PAYMENT),
    reason: "abandoned",
  }]);
  assert.notEqual(rejectStripe.cancels[0].key, expireStripe.cancels[0].key);
  assert.equal(claimOf(rejected).release_reason, "client_rejected");
  assert.equal(claimOf(expired).release_reason, "confirmation_expired");
  assert.equal(claimOf(rejected).status, "released");
  assert.equal(claimOf(expired).status, "expired");
});
