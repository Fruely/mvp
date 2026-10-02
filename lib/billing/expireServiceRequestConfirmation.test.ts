import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { GET } from "../../app/api/cron/service-request-confirmation-expiry/route.ts";
import { createServiceRequestAuthorization } from "./createServiceRequestAuthorization.ts";
import { confirmServiceRequestConnection } from "./confirmServiceRequestConnection.ts";
import {
  CONFIRMATION_EXPIRED_RELEASE_REASON,
  CONFIRMATION_EXPIRY_BATCH_LIMIT,
  expireServiceRequestConfirmation,
  reconcileExpiredServiceRequestConfirmations,
  serviceRequestExpiryIdempotencyKey,
  type ServiceRequestExpiryStripe,
} from "./expireServiceRequestConfirmation.ts";
import { processStripeWebhookEventForServiceRequestAuthorization } from "./processServiceRequestAuthorizationWebhook.ts";
import { rejectServiceRequestConnection } from "./rejectServiceRequestConnection.ts";
import { buildMatchedServiceRequestOfferIdempotencyKey } from "../leadEngine/requestOfferPolicy.ts";
import { reserveOwnMatch } from "../selection/reserveMatch.ts";

const CLIENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SPEC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_SPEC = "abababab-abab-4aba-8aba-abababababab";
const REQUEST = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MATCH = "11111111-1111-4111-8111-111111111111";
const OTHER_MATCH = "22222222-2222-4222-8222-222222222222";
const OFFER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CLAIM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PAYMENT = "12121212-1212-4121-8121-121212121212";
const PUBLIC_ID = "REQ-20261002-EXPIRE";
const PAST = "2020-01-01T00:00:00.000Z";
const FUTURE = "2099-01-01T00:00:00.000Z";
const NOW = new Date("2026-10-02T20:00:00.000Z");
const FLAGS = {
  SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true",
  SERVICE_REQUEST_PAYMENT_AUTH_ENABLED: "true",
  SERVICE_REQUEST_CAPTURE_ENABLED: "true",
  SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: "900",
};

type Row = Record<string, unknown>;

class Memory {
  readonly tables: Record<string, Row[]>;
  readonly order: string[] = [];
  reserveCalls = 0;
  failClaimExpire = false;
  constructor(seed: Record<string, Row[]>) {
    this.tables = {};
    for (const [name, rows] of Object.entries(seed)) this.tables[name] = rows.map((row) => ({ ...row }));
  }
  from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let patch: Row | null = null;
    let limitN = 100;
    let orderBy: { column: string; ascending: boolean } | null = null;
    const rows = () => (this.tables[table] ??= []);
    const matched = () => {
      const found = rows().filter((row) => filters.every((filter) => filter(row)));
      if (orderBy) {
        found.sort((left, right) => {
          const compared = String(left[orderBy?.column ?? ""]).localeCompare(String(right[orderBy?.column ?? ""]));
          return orderBy?.ascending === false ? -compared : compared;
        });
      }
      return found.slice(0, limitN);
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
      lte(column: string, value: unknown) {
        filters.push((row) => String(row[column]) <= String(value));
        return api;
      },
      not(column: string, operator: string, value: unknown) {
        if (operator === "is" && value == null) filters.push((row) => row[column] != null);
        return api;
      },
      order(column: string, options?: { ascending?: boolean }) {
        orderBy = { column, ascending: options?.ascending !== false };
        return api;
      },
      limit(value: number) {
        limitN = value;
        return api;
      },
      update(next: Row) {
        patch = next;
        return api;
      },
      maybeSingle: async () => {
        const failed = this.blocked(table, patch);
        if (failed) return { data: null, error: { message: failed } };
        this.note(table, patch);
        if (patch) for (const row of matched()) Object.assign(row, patch);
        patch = null;
        const row = matched()[0] ?? null;
        return { data: row ? { ...row } : null, error: null };
      },
      then: (
        resolve: (value: { data: Row[] | null; error: { message: string } | null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => {
        const failed = this.blocked(table, patch);
        if (failed) return Promise.resolve({ data: null, error: { message: failed } }).then(resolve, reject);
        this.note(table, patch);
        if (patch) for (const row of matched()) Object.assign(row, patch);
        patch = null;
        return Promise.resolve({ data: matched().map((row) => ({ ...row })), error: null }).then(resolve, reject);
      },
    };
    return api;
  }
  async rpc(fn: string, args: { p_claim_id?: string; p_decision?: string; p_match_id?: string; p_specialist_id?: string }) {
    if (fn === "reserve_service_request_claim") {
      this.reserveCalls += 1;
      const match = this.tables.service_request_matches?.find((row) => row.id === args.p_match_id);
      if (!match || match.status !== "active") return { data: { ok: false, error: "not_claimable" }, error: null };
      this.tables.service_request_claims.push({
        id: crypto.randomUUID(),
        status: "reserved",
        specialist_id: args.p_specialist_id,
        service_request_id: match.service_request_id,
        match_id: match.id,
      });
      return { data: { ok: true }, error: null };
    }
    if (fn === "apply_service_request_client_decision") {
      const claim = this.tables.service_request_claims.find((row) => row.id === args.p_claim_id);
      const match = this.tables.service_request_matches.find((row) => row.id === claim?.match_id);
      if (!claim || claim.status !== "reserved" || !match) return { data: { ok: false, error: "not_claimable" }, error: null };
      if (args.p_decision === "confirm" && claim.client_confirmed_at && !claim.client_rejected_at) {
        return { data: { ok: true, at: claim.client_confirmed_at }, error: null };
      }
      if (args.p_decision === "reject" && claim.client_rejected_at && !claim.client_confirmed_at) {
        return { data: { ok: true, at: claim.client_rejected_at }, error: null };
      }
      if (claim.client_confirmed_at || claim.client_rejected_at) return { data: { ok: false, error: "not_claimable" }, error: null };
      const deadline = typeof claim.confirmation_expires_at === "string" ? Date.parse(claim.confirmation_expires_at) : Number.NaN;
      if (match.status === "expired" || (Number.isFinite(deadline) && deadline <= Date.now())) {
        return { data: { ok: false, error: "confirmation_expired" }, error: null };
      }
      if (match.status !== "active" && match.status !== "interested") return { data: { ok: false, error: "not_claimable" }, error: null };
      const at = new Date().toISOString();
      if (args.p_decision === "confirm") claim.client_confirmed_at = at;
      else claim.client_rejected_at = at;
      return { data: { ok: true, at }, error: null };
    }
    if (fn !== "begin_service_request_confirmation_expiry") return { data: null, error: { message: "unknown rpc" } };
    const claim = this.tables.service_request_claims.find((row) => row.id === args.p_claim_id);
    const match = this.tables.service_request_matches.find((row) => row.id === claim?.match_id);
    const request = this.tables.service_requests.find((row) => row.id === claim?.service_request_id);
    const deadline = typeof claim?.confirmation_expires_at === "string" ? Date.parse(claim.confirmation_expires_at) : Number.NaN;
    if (
      !claim ||
      !match ||
      !request ||
      claim.status !== "reserved" ||
      claim.payment_rail !== "stripe" ||
      claim.client_confirmed_at ||
      claim.client_rejected_at ||
      !Number.isFinite(deadline) ||
      deadline > Date.now() ||
      request.selected_specialist_id
    ) {
      return { data: { ok: false, error: "not_eligible" }, error: null };
    }
    if (match.status === "expired") return { data: { ok: true, state: "started" }, error: null };
    if (match.status !== "active" && match.status !== "interested") {
      return { data: { ok: false, error: "not_eligible" }, error: null };
    }
    this.order.push(`match-while-claim:${claim.status}`);
    match.status = "expired";
    return { data: { ok: true, state: "started" }, error: null };
  }
  private blocked(table: string, patch: Row | null): string | null {
    if (this.failClaimExpire && patch && table === "service_request_claims" && patch.status === "expired") {
      this.failClaimExpire = false;
      return "claim expire failed";
    }
    return null;
  }
  private note(table: string, patch: Row | null) {
    if (patch && table === "service_request_claims" && patch.status === "expired") {
      this.order.push(`claim-while-match:${this.tables.service_request_matches[0]?.status}`);
    }
  }
}

function seed(deadline: string | null = PAST) {
  return new Memory({
    service_requests: [{ id: REQUEST, public_id: PUBLIC_ID, client_user_id: CLIENT, selected_specialist_id: null }],
    service_request_claims: [{
      id: CLAIM,
      status: "reserved",
      specialist_id: SPEC,
      service_request_id: REQUEST,
      match_id: MATCH,
      request_offer_id: OFFER,
      client_confirmed_at: null,
      client_rejected_at: null,
      payment_rail: "stripe",
      release_reason: null,
      released_at: null,
      expired_at: null,
      confirmation_expires_at: deadline,
    }],
    service_request_matches: [
      { id: MATCH, service_request_id: REQUEST, specialist_id: SPEC, status: "active" },
      { id: OTHER_MATCH, service_request_id: REQUEST, specialist_id: OTHER_SPEC, status: "active" },
    ],
    request_offers: [{
      id: OFFER,
      request_kind: "service_request",
      offer_reason: "matched",
      service_request_id: REQUEST,
      specialist_id: SPEC,
      billing_model: "pay_per_lead",
      status: "offered",
      price_cents: 2500,
      currency: "eur",
      idempotency_key: buildMatchedServiceRequestOfferIdempotencyKey({ requestId: REQUEST, specialistId: SPEC }),
    }],
    request_offer_payments: [{
      id: PAYMENT,
      offer_id: OFFER,
      specialist_id: SPEC,
      service_request_claim_id: CLAIM,
      amount_cents: 2500,
      currency: "eur",
      status: "authorized",
      provider: "stripe",
      stripe_payment_intent_id: "pi_auth",
    }],
    request_offer_access_grants: [],
    conversations: [],
    inbox_items: [{ id: "inbox-1", dedupe_key: `claim:${CLAIM}:connection_confirmation_required` }],
    notification_outbox: [{ id: "outbox-1", inbox_item_id: "inbox-1", status: "pending" }],
  });
}

function stripeFor(status = "requires_capture") {
  const cancels: Array<{ id: string; reason: string; key: string }> = [];
  const captures: string[] = [];
  let current = status;
  let failCancel = false;
  const stripe: ServiceRequestExpiryStripe = {
    paymentIntents: {
      retrieve: async (id) => ({
        id,
        amount: 2500,
        currency: "eur",
        status: current,
        metadata: {
          purpose: "service_request_access_authorization",
          payment_id: PAYMENT,
          offer_id: OFFER,
          claim_id: CLAIM,
          specialist_id: SPEC,
        },
      }),
      cancel: async (id, params: { cancellation_reason: string }, options) => {
        if (failCancel) {
          failCancel = false;
          throw new Error("cancel failed");
        }
        cancels.push({ id, reason: params.cancellation_reason, key: options.idempotencyKey });
        current = "canceled";
        return { id, amount: 2500, currency: "eur", status: "canceled", metadata: {} };
      },
    },
  };
  return {
    stripe,
    cancels,
    captures,
    failNextCancel() {
      failCancel = true;
    },
    markCanceled() {
      current = "canceled";
    },
    markSucceeded() {
      current = "succeeded";
    },
  };
}

function claim(db: Memory) {
  return db.tables.service_request_claims[0];
}

async function expire(db: Memory, stripe: ServiceRequestExpiryStripe, now = NOW) {
  return expireServiceRequestConfirmation({
    supabase: db as unknown as SupabaseClient,
    claimId: CLAIM,
    stripe,
    now,
  });
}

test("the expiry worker ignores a store claim", async () => {
  const db = seed();
  claim(db).payment_rail = "store";
  const gate = stripeFor();
  assert.equal(await expire(db, gate.stripe), "skipped");
  assert.equal(gate.cancels.length, 0);
  assert.equal(gate.captures.length, 0);
  assert.equal(claim(db)?.status, "reserved");
  assert.equal(claim(db)?.release_reason, null);
  assert.equal(claim(db)?.client_confirmed_at, null);
  assert.equal(db.tables.service_request_matches[0]?.status, "active");
});

test("a future deadline does not expire or cancel", async () => {
  const db = seed(FUTURE);
  const gate = stripeFor();
  const result = await expire(db, gate.stripe);
  assert.equal(result, "skipped");
  assert.equal(gate.cancels.length, 0);
  assert.equal(claim(db)?.status, "reserved");
  assert.equal(db.tables.service_request_matches[0]?.status, "active");
});

test("an exact deadline is eligible and a null deadline is ignored", async () => {
  const exact = seed("2026-10-02T20:00:00.000Z");
  const gate = stripeFor();
  assert.equal(await expire(exact, gate.stripe, NOW), "expired");
  assert.equal(gate.cancels.length, 1);
  const missing = seed(null);
  const untouched = stripeFor();
  assert.equal(await expire(missing, untouched.stripe), "skipped");
  assert.equal(untouched.cancels.length, 0);
  assert.equal(claim(missing)?.status, "reserved");
  assert.equal(missing.tables.service_request_matches[0]?.status, "active");
});

test("confirmed and rejected claims are not expired", async () => {
  const confirmed = seed();
  claim(confirmed).client_confirmed_at = "2026-10-02T18:00:00.000Z";
  const confirmedGate = stripeFor();
  assert.equal(await expire(confirmed, confirmedGate.stripe), "skipped");
  assert.equal(confirmedGate.cancels.length, 0);
  assert.equal(claim(confirmed)?.status, "reserved");
  const rejected = seed();
  claim(rejected).client_rejected_at = "2026-10-02T18:00:00.000Z";
  const rejectedGate = stripeFor();
  assert.equal(await expire(rejected, rejectedGate.stripe), "skipped");
  assert.equal(rejectedGate.cancels.length, 0);
  assert.equal(claim(rejected)?.release_reason, null);
});

test("a canonical 2500 eur authorization expires without capture or rematch", async () => {
  const db = seed();
  const gate = stripeFor();
  const result = await expire(db, gate.stripe);
  assert.equal(result, "expired");
  assert.equal(gate.captures.length, 0);
  assert.equal(gate.cancels.length, 1);
  assert.equal(gate.cancels[0]?.key, serviceRequestExpiryIdempotencyKey(PAYMENT));
  assert.equal(gate.cancels[0]?.reason, "abandoned");
  assert.deepEqual(db.order, ["match-while-claim:reserved", "claim-while-match:expired"]);
  const payment = db.tables.request_offer_payments[0];
  assert.equal(payment?.status, "released");
  assert.equal(typeof payment?.released_at, "string");
  assert.equal(payment?.amount_cents, 2500);
  assert.equal(payment?.currency, "eur");
  assert.equal(db.tables.service_request_matches[0]?.status, "expired");
  assert.equal(db.tables.service_request_matches[1]?.status, "active");
  const row = claim(db);
  assert.equal(row?.status, "expired");
  assert.equal(typeof row?.expired_at, "string");
  assert.equal(row?.release_reason, CONFIRMATION_EXPIRED_RELEASE_REASON);
  assert.equal(row?.released_at, null);
  assert.equal(row?.client_confirmed_at, null);
  assert.equal(row?.client_rejected_at, null);
  assert.equal(row?.confirmation_expires_at, PAST);
  assert.equal(db.tables.service_requests[0]?.selected_specialist_id, null);
  assert.equal(db.tables.request_offer_access_grants.length, 0);
  assert.equal(db.tables.conversations.length, 0);
  assert.equal(db.tables.service_request_claims.length, 1);
  assert.equal(db.tables.request_offers.length, 1);
  assert.equal(db.tables.request_offer_payments.length, 1);
  assert.equal(db.tables.inbox_items.length, 1);
  assert.equal(db.tables.notification_outbox[0]?.status, "cancelled");
  assert.equal(db.reserveCalls, 0);
  const again = await expire(db, gate.stripe);
  assert.equal(again, "expired");
  assert.equal(gate.cancels.length, 1);
  const reserved = await reserveOwnMatch(
    db as unknown as SupabaseClient,
    { matchId: MATCH, specialistId: SPEC },
    {},
  );
  assert.deepEqual(reserved, { ok: false, error: "not_found" });
  assert.equal(db.tables.service_request_claims.length, 1);
  assert.equal(db.tables.service_request_matches[1]?.status, "active");
});

test("a failed Stripe cancellation keeps the match closed and a retry finishes", async () => {
  const db = seed();
  const gate = stripeFor();
  gate.failNextCancel();
  const first = await expire(db, gate.stripe);
  assert.equal(first, "retryable");
  assert.equal(db.tables.service_request_matches[0]?.status, "expired");
  assert.equal(claim(db)?.status, "reserved");
  assert.equal(claim(db)?.client_confirmed_at, null);
  assert.equal(claim(db)?.client_rejected_at, null);
  assert.equal(db.tables.request_offer_payments[0]?.status, "authorized");
  const confirmed = await confirmServiceRequestConnection({
    supabase: db as unknown as SupabaseClient,
    publicId: PUBLIC_ID,
    clientUserId: CLIENT,
    env: FLAGS,
    stripe: { paymentIntents: { retrieve: async () => { throw new Error("no capture"); }, capture: async () => { throw new Error("no capture"); } } },
  });
  assert.equal(confirmed.ok, false);
  assert.equal(claim(db)?.client_confirmed_at, null);
  const rejected = await rejectServiceRequestConnection({
    supabase: db as unknown as SupabaseClient,
    publicId: PUBLIC_ID,
    clientUserId: CLIENT,
    env: {},
    stripe: gate.stripe,
  });
  assert.equal(rejected.ok, false);
  assert.equal(claim(db)?.client_rejected_at, null);
  assert.equal(gate.cancels.length, 0);
  const second = await expire(db, gate.stripe);
  assert.equal(second, "expired");
  assert.equal(gate.cancels.length, 1);
  assert.equal(claim(db)?.status, "expired");
  assert.equal(claim(db)?.release_reason, CONFIRMATION_EXPIRED_RELEASE_REASON);
});

test("local expiry resumes after Stripe is already canceled", async () => {
  const db = seed();
  const gate = stripeFor();
  db.failClaimExpire = true;
  const first = await expire(db, gate.stripe);
  assert.equal(first, "retryable");
  assert.equal(gate.cancels.length, 1);
  assert.equal(db.tables.request_offer_payments[0]?.status, "released");
  assert.equal(db.tables.service_request_matches[0]?.status, "expired");
  assert.equal(claim(db)?.status, "reserved");
  const second = await expire(db, gate.stripe);
  assert.equal(second, "expired");
  assert.equal(gate.cancels.length, 1);
  assert.equal(claim(db)?.status, "expired");
  assert.equal(gate.captures.length, 0);
});

test("confirm and expiry cannot both win", async () => {
  const open = seed(FUTURE);
  const openGate = stripeFor();
  const confirmed = await confirmServiceRequestConnection({
    supabase: open as unknown as SupabaseClient,
    publicId: PUBLIC_ID,
    clientUserId: CLIENT,
    env: FLAGS,
    stripe: {
      paymentIntents: {
        retrieve: async (id) => ({
          id,
          amount: 2500,
          currency: "eur",
          status: "requires_capture",
          metadata: {
            purpose: "service_request_access_authorization",
            payment_id: PAYMENT,
            offer_id: OFFER,
            claim_id: CLAIM,
            specialist_id: SPEC,
          },
        }),
        capture: async (id) => ({ id, amount: 2500, currency: "eur", status: "succeeded" }),
      },
    },
  });
  assert.equal(confirmed.ok, true);
  assert.equal(typeof claim(open)?.client_confirmed_at, "string");
  const cancelsBeforeExpiry = openGate.cancels.length;
  assert.equal(await expire(open, openGate.stripe, new Date("2026-01-01T00:00:00.000Z")), "skipped");
  assert.equal(openGate.cancels.length, cancelsBeforeExpiry);
  assert.equal(open.tables.service_request_matches[0]?.status, "active");

  const closed = seed();
  const closedGate = stripeFor();
  assert.equal(await expire(closed, closedGate.stripe), "expired");
  const late = await confirmServiceRequestConnection({
    supabase: closed as unknown as SupabaseClient,
    publicId: PUBLIC_ID,
    clientUserId: CLIENT,
    env: FLAGS,
    stripe: { paymentIntents: { retrieve: async () => { throw new Error("no"); }, capture: async () => { throw new Error("no"); } } },
  });
  assert.equal(late.ok, false);
  assert.equal(claim(closed)?.client_confirmed_at, null);
  assert.equal(closedGate.cancels.length, 1);
});

test("reject and expiry cannot both win", async () => {
  const open = seed(FUTURE);
  const openGate = stripeFor();
  const rejected = await rejectServiceRequestConnection({
    supabase: open as unknown as SupabaseClient,
    publicId: PUBLIC_ID,
    clientUserId: CLIENT,
    env: FLAGS,
    stripe: openGate.stripe,
  });
  assert.equal(rejected.ok, true);
  assert.equal(claim(open)?.status, "released");
  assert.equal(claim(open)?.release_reason, "client_rejected");
  assert.equal(await expire(open, openGate.stripe, new Date("2026-01-01T00:00:00.000Z")), "skipped");
  assert.equal(claim(open)?.status, "released");
  assert.notEqual(claim(open)?.release_reason, CONFIRMATION_EXPIRED_RELEASE_REASON);

  const closed = seed();
  const closedGate = stripeFor();
  closedGate.failNextCancel();
  assert.equal(await expire(closed, closedGate.stripe), "retryable");
  const late = await rejectServiceRequestConnection({
    supabase: closed as unknown as SupabaseClient,
    publicId: PUBLIC_ID,
    clientUserId: CLIENT,
    env: {},
    stripe: closedGate.stripe,
  });
  assert.equal(late.ok, false);
  assert.equal(claim(closed)?.client_rejected_at, null);
  assert.equal(claim(closed)?.status, "reserved");
  assert.equal(closed.tables.service_request_matches[0]?.status, "expired");
});

test("authorization and capturable updates do not reopen an expired attempt", async () => {
  const db = seed();
  const gate = stripeFor();
  assert.equal(await expire(db, gate.stripe), "expired");
  const authorized = await createServiceRequestAuthorization({
    supabase: db as unknown as SupabaseClient,
    claimId: CLAIM,
    specialistId: SPEC,
    userId: SPEC,
    env: FLAGS,
    stripe: null,
  });
  assert.deepEqual(authorized, { ok: false, error: "not_claimable" });
  assert.equal(db.tables.request_offer_payments.length, 1);
  const pending = seed();
  claim(pending).confirmation_expires_at = PAST;
  pending.tables.service_request_matches[0].status = "expired";
  pending.tables.request_offer_payments[0].status = "pending";
  pending.tables.request_offer_payments[0].authorized_at = null;
  const event = {
    id: "evt_1",
    type: "payment_intent.amount_capturable_updated",
    data: {
      object: {
        object: "payment_intent",
        id: "pi_auth",
        amount: 2500,
        currency: "eur",
        status: "requires_capture",
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
  const updated = await processStripeWebhookEventForServiceRequestAuthorization(
    pending as unknown as SupabaseClient,
    event,
    FLAGS,
  );
  assert.deepEqual(updated, { outcome: "success" });
  assert.equal(pending.tables.request_offer_payments[0]?.status, "pending");
  assert.equal(pending.tables.request_offer_payments[0]?.authorized_at, null);
  assert.equal(pending.tables.notification_outbox[0]?.status, "pending");
});

function canceledEvent(): Stripe.Event {
  return {
    id: "evt_cancel",
    type: "payment_intent.canceled",
    data: {
      object: {
        object: "payment_intent",
        id: "pi_auth",
        amount: 2500,
        currency: "eur",
        status: "canceled",
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

test("a canceled webhook finishes expiry once and a paid connection stays paid", async () => {
  const db = seed();
  db.tables.service_request_matches[0].status = "expired";
  const canceled = canceledEvent();
  const first = await processStripeWebhookEventForServiceRequestAuthorization(db as unknown as SupabaseClient, canceled, {});
  const second = await processStripeWebhookEventForServiceRequestAuthorization(db as unknown as SupabaseClient, canceled, {});
  assert.deepEqual(first, { outcome: "success" });
  assert.deepEqual(second, { outcome: "success" });
  assert.equal(claim(db)?.status, "expired");
  assert.equal(claim(db)?.release_reason, CONFIRMATION_EXPIRED_RELEASE_REASON);
  assert.equal(db.tables.request_offer_payments[0]?.status, "released");
  assert.equal(db.tables.service_request_claims.length, 1);

  const paid = seed();
  paid.tables.request_offer_payments[0].status = "paid";
  claim(paid).status = "completed";
  claim(paid).client_confirmed_at = "2026-10-02T18:00:00.000Z";
  const blocked = await processStripeWebhookEventForServiceRequestAuthorization(
    paid as unknown as SupabaseClient,
    canceled,
    {},
  );
  assert.deepEqual(blocked, { outcome: "validation_failed" });
  assert.equal(paid.tables.request_offer_payments[0]?.status, "paid");
  assert.equal(claim(paid)?.status, "completed");
  assert.notEqual(claim(paid)?.release_reason, CONFIRMATION_EXPIRED_RELEASE_REASON);
});

test("an expired match without a due confirmation deadline is not confirmation expiry", async () => {
  for (const deadline of [FUTURE, null]) {
    const db = seed(deadline);
    db.tables.service_request_matches[0].status = "expired";
    const result = await processStripeWebhookEventForServiceRequestAuthorization(
      db as unknown as SupabaseClient,
      canceledEvent(),
      {},
    );
    assert.equal(result.outcome, "success");
    assert.equal(claim(db)?.status, "reserved");
    assert.equal(claim(db)?.release_reason, null);
    assert.equal(claim(db)?.expired_at, null);
  }
});

test("a historical expired match without canonical expiry facts is not relabeled", async () => {
  const storeRail = seed();
  storeRail.tables.service_request_matches[0].status = "expired";
  claim(storeRail).payment_rail = "store";
  await processStripeWebhookEventForServiceRequestAuthorization(storeRail as unknown as SupabaseClient, canceledEvent(), {});
  assert.equal(claim(storeRail)?.status, "reserved");
  assert.equal(claim(storeRail)?.release_reason, null);

  const selected = seed();
  selected.tables.service_request_matches[0].status = "expired";
  selected.tables.service_requests[0].selected_specialist_id = SPEC;
  await processStripeWebhookEventForServiceRequestAuthorization(selected as unknown as SupabaseClient, canceledEvent(), {});
  assert.equal(claim(selected)?.status, "reserved");
  assert.equal(claim(selected)?.release_reason, null);

  const closed = seed();
  closed.tables.service_request_matches[0].status = "expired";
  claim(closed).status = "released";
  await processStripeWebhookEventForServiceRequestAuthorization(closed as unknown as SupabaseClient, canceledEvent(), {});
  assert.equal(claim(closed)?.status, "released");
  assert.equal(claim(closed)?.release_reason, null);

  const priced = seed();
  priced.tables.service_request_matches[0].status = "expired";
  priced.tables.request_offer_payments[0].amount_cents = 7000;
  assert.deepEqual(
    await processStripeWebhookEventForServiceRequestAuthorization(priced as unknown as SupabaseClient, canceledEvent(), {}),
    { outcome: "validation_failed" },
  );
  assert.equal(claim(priced)?.status, "reserved");
  assert.equal(claim(priced)?.release_reason, null);
});

test("a canceled webhook finishes an expiry the begin function already started", async () => {
  const db = seed();
  const gate = stripeFor();
  gate.failNextCancel();
  assert.equal(await expire(db, gate.stripe), "retryable");
  assert.equal(db.tables.service_request_matches[0]?.status, "expired");
  assert.equal(claim(db)?.status, "reserved");
  const first = await processStripeWebhookEventForServiceRequestAuthorization(
    db as unknown as SupabaseClient,
    canceledEvent(),
    {},
  );
  const second = await processStripeWebhookEventForServiceRequestAuthorization(
    db as unknown as SupabaseClient,
    canceledEvent(),
    {},
  );
  assert.deepEqual(first, { outcome: "success" });
  assert.deepEqual(second, { outcome: "success" });
  assert.equal(claim(db)?.status, "expired");
  assert.equal(claim(db)?.release_reason, CONFIRMATION_EXPIRED_RELEASE_REASON);
  assert.equal(claim(db)?.client_confirmed_at, null);
  assert.equal(claim(db)?.client_rejected_at, null);
  assert.equal(claim(db)?.released_at, null);
  assert.equal(db.tables.request_offer_payments[0]?.status, "released");
  assert.equal(gate.captures.length, 0);
  assert.equal(db.tables.service_request_claims.length, 1);
  assert.equal(db.tables.service_request_matches[1]?.status, "active");
});

test("a client rejection stays client_rejected when the match is already expired", async () => {
  const db = seed();
  db.tables.service_request_matches[0].status = "expired";
  claim(db).client_rejected_at = "2026-10-02T18:00:00.000Z";
  const result = await processStripeWebhookEventForServiceRequestAuthorization(
    db as unknown as SupabaseClient,
    canceledEvent(),
    {},
  );
  assert.deepEqual(result, { outcome: "success" });
  assert.equal(claim(db)?.status, "released");
  assert.equal(claim(db)?.release_reason, "client_rejected");
  assert.equal(claim(db)?.expired_at, null);
  assert.equal(db.tables.service_request_claims.length, 1);
});

test("disabled commercial flags do not strand an expired authorization", async () => {
  const db = seed();
  const gate = stripeFor();
  const result = await expireServiceRequestConfirmation({
    supabase: db as unknown as SupabaseClient,
    claimId: CLAIM,
    stripe: gate.stripe,
    now: NOW,
  });
  assert.equal(result, "expired");
  assert.equal(gate.cancels.length, 1);
  assert.equal(db.tables.request_offer_payments[0]?.amount_cents, 2500);
});

test("concurrent expiry calls stay on one terminal claim", async () => {
  const db = seed();
  const gate = stripeFor();
  const [left, right] = await Promise.all([expire(db, gate.stripe), expire(db, gate.stripe)]);
  assert.equal(left, "expired");
  assert.equal(right, "expired");
  assert.equal(claim(db)?.status, "expired");
  assert.equal(db.tables.service_request_claims.length, 1);
  assert.equal(db.tables.service_request_matches[1]?.status, "active");
  assert.equal(gate.captures.length, 0);
  assert.equal(gate.cancels.every((row) => row.key === serviceRequestExpiryIdempotencyKey(PAYMENT)), true);
});

test("older due store claims do not consume the stripe expiry batch", async () => {
  const db = seed();
  const storeIds: string[] = [];
  for (let index = 0; index < CONFIRMATION_EXPIRY_BATCH_LIMIT; index += 1) {
    const id = `51515151-5151-4515-8515-${String(index).padStart(12, "0")}`;
    storeIds.push(id);
    db.tables.service_request_claims.push({
      id,
      status: "reserved",
      specialist_id: OTHER_SPEC,
      service_request_id: REQUEST,
      match_id: OTHER_MATCH,
      request_offer_id: OFFER,
      client_confirmed_at: null,
      client_rejected_at: null,
      payment_rail: "store",
      release_reason: null,
      released_at: null,
      expired_at: null,
      confirmation_expires_at: `2010-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
    });
  }
  const gate = stripeFor();
  const batch = await reconcileExpiredServiceRequestConfirmations({
    supabase: db as unknown as SupabaseClient,
    stripe: gate.stripe,
    now: NOW,
  });
  assert.equal(CONFIRMATION_EXPIRY_BATCH_LIMIT, 25);
  assert.equal(batch.examined, 1);
  assert.equal(batch.expired, 1);
  assert.equal(batch.skipped, 0);
  assert.equal(claim(db)?.status, "expired");
  assert.equal(claim(db)?.payment_rail, "stripe");
  assert.equal(claim(db)?.release_reason, CONFIRMATION_EXPIRED_RELEASE_REASON);
  assert.equal(gate.cancels.length, 1);
  assert.equal(gate.captures.length, 0);
  assert.equal(db.reserveCalls, 0);
  assert.equal(db.tables.service_request_claims.length, storeIds.length + 1);
  for (const id of storeIds) {
    const row = db.tables.service_request_claims.find((item) => item.id === id);
    assert.equal(row?.status, "reserved");
    assert.equal(row?.payment_rail, "store");
    assert.equal(row?.release_reason, null);
    assert.equal(row?.expired_at, null);
    assert.equal(row?.client_confirmed_at, null);
    assert.equal(row?.client_rejected_at, null);
  }
});

test("the cron route requires the cron secret and processes a bounded batch independently", async () => {
  const missing = await GET(new NextRequest("http://localhost/api/cron/service-request-confirmation-expiry"));
  assert.equal(missing.status, 401);
  const wrong = await GET(new NextRequest("http://localhost/api/cron/service-request-confirmation-expiry", {
    headers: { authorization: "Bearer wrong" },
  }));
  assert.equal(wrong.status, 401);
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "cron-test-secret";
  const accepted = await GET(new NextRequest("http://localhost/api/cron/service-request-confirmation-expiry", {
    headers: { authorization: "Bearer cron-test-secret" },
  }));
  if (previous === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = previous;
  assert.equal(accepted.status, 500);

  const db = seed();
  const secondId = "cdcdcdcd-cdcd-4cdc-8cdc-cdcdcdcdcdcd";
  const secondMatch = "33333333-3333-4333-8333-333333333333";
  const secondPayment = "34343434-3434-4343-8343-343434343434";
  db.tables.service_request_matches.push({
    id: secondMatch,
    service_request_id: REQUEST,
    specialist_id: OTHER_SPEC,
    status: "active",
  });
  db.tables.service_request_claims.push({
    ...claim(db),
    id: secondId,
    match_id: secondMatch,
    specialist_id: OTHER_SPEC,
    confirmation_expires_at: "2020-01-02T00:00:00.000Z",
  });
  db.tables.request_offer_payments.push({
    ...db.tables.request_offer_payments[0],
    id: secondPayment,
    service_request_claim_id: secondId,
    specialist_id: OTHER_SPEC,
    stripe_payment_intent_id: "pi_other",
  });
  const gate = stripeFor();
  gate.stripe.paymentIntents.retrieve = async (id) => ({
    id,
    amount: 2500,
    currency: "eur",
    status: id === "pi_other" ? "requires_capture" : "requires_capture",
    metadata: {
      purpose: "service_request_access_authorization",
      payment_id: id === "pi_other" ? secondPayment : PAYMENT,
      offer_id: OFFER,
      claim_id: id === "pi_other" ? secondId : CLAIM,
      specialist_id: id === "pi_other" ? OTHER_SPEC : SPEC,
    },
  });
  const bounded = await reconcileExpiredServiceRequestConfirmations({
    supabase: db as unknown as SupabaseClient,
    stripe: gate.stripe,
    now: NOW,
    limit: 1,
  });
  assert.equal(bounded.examined, 1);
  assert.equal(bounded.expired, 1);
  assert.equal(CONFIRMATION_EXPIRY_BATCH_LIMIT, 25);
  assert.equal(db.tables.service_request_claims[1]?.status, "reserved");
  assert.equal(db.tables.service_request_matches[1]?.status, "active");
  gate.failNextCancel();
  const failedSecond = await reconcileExpiredServiceRequestConfirmations({
    supabase: db as unknown as SupabaseClient,
    stripe: gate.stripe,
    now: NOW,
  });
  assert.equal(failedSecond.examined, 1);
  assert.equal(failedSecond.retryable, 1);
  assert.equal(db.tables.service_request_claims[0]?.status, "expired");
  assert.equal(db.tables.service_request_claims[1]?.status, "reserved");
  const finished = await reconcileExpiredServiceRequestConfirmations({
    supabase: db as unknown as SupabaseClient,
    stripe: gate.stripe,
    now: NOW,
  });
  assert.equal(finished.expired, 1);
  assert.equal(db.tables.service_request_claims[1]?.status, "expired");
  assert.equal(db.tables.service_request_matches[1]?.status, "active");
  assert.equal(db.tables.service_request_claims.length, 2);
  assert.equal(db.reserveCalls, 0);
  const schedule = readFileSync(new URL("../../vercel.json", import.meta.url), "utf8");
  assert.match(schedule, /\/api\/cron\/service-request-confirmation-expiry/);
  assert.match(schedule, /"schedule": "\*\/5 \* \* \* \*"/);
  const route = readFileSync(new URL("../../app/api/cron/service-request-confirmation-expiry/route.ts", import.meta.url), "utf8");
  assert.match(route, /CRON_SECRET/);
  const migration = readFileSync(
    new URL("../../supabase/manual_migrations/2026-10-02_service_request_confirmation_expiry.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /clock_timestamp\(\)/);
  assert.match(migration, /confirmation_expires_at > clock_timestamp\(\)/);
  assert.match(migration, /payment_rail = 'store'/);
  assert.match(migration, /payment_rail = 'stripe'/);
  assert.match(migration, /payment_rail IS DISTINCT FROM 'stripe'/);
  assert.equal(migration.includes("connection_attempts"), false);
  const root = new URL("../..", import.meta.url);
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith(".sql") && /UPDATE\s+public\.service_request_matches\s+SET\s+status\s*=\s*'expired'/i.test(readFileSync(full, "utf8"))) {
        hits.push(path.relative(root.pathname, full));
      }
    }
  };
  walk(path.join(root.pathname, "supabase/manual_migrations"));
  assert.deepEqual(hits, ["supabase/manual_migrations/2026-10-02_service_request_confirmation_expiry.sql"]);
});
