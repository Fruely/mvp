import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildMatchedServiceRequestOfferIdempotencyKey } from "../leadEngine/requestOfferPolicy.ts";
import { reserveOwnMatch } from "../selection/reserveMatch.ts";
import { createServiceRequestAuthorization } from "./createServiceRequestAuthorization.ts";
import { confirmServiceRequestConnection } from "./confirmServiceRequestConnection.ts";
import { isServiceRequestClientConfirmationRequired } from "./serviceRequestClientConfirmationReadiness.ts";
import {
  CLIENT_REJECTION_RELEASE_REASON,
  rejectServiceRequestConnection,
  serviceRequestReleaseIdempotencyKey,
  type ServiceRequestReleaseStripe,
} from "./rejectServiceRequestConnection.ts";

const CLIENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OTHER = "99999999-9999-4999-8999-999999999999";
const SPEC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_SPEC = "abababab-abab-4aba-8aba-abababababab";
const REQUEST = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MATCH = "11111111-1111-4111-8111-111111111111";
const OTHER_MATCH = "22222222-2222-4222-8222-222222222222";
const OFFER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CLAIM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PAYMENT = "12121212-1212-4121-8121-121212121212";
const PUBLIC_ID = "REQ-20261003-REJECT";
const DEADLINE = "2099-01-01T00:00:00.000Z";
const PAID = { SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true" };
const FLAGS = {
  ...PAID,
  SERVICE_REQUEST_PAYMENT_AUTH_ENABLED: "true",
  SERVICE_REQUEST_CAPTURE_ENABLED: "true",
  SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: "900",
};

type Row = Record<string, unknown>;

class Memory {
  readonly tables: Record<string, Row[]>;
  readonly order: string[] = [];
  rpcCalls = 0;
  failClaimRelease = false;
  failMatchClose = false;

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
      update(next: Row) { patch = next; return api; },
      maybeSingle: async () => {
        const failed = this.blockedPatch(table, patch);
        if (failed) {
          patch = null;
          return { data: null, error: { message: failed } };
        }
        this.notePatch(table, patch);
        if (patch) for (const row of matched()) Object.assign(row, patch);
        patch = null;
        const row = matched()[0] ?? null;
        return { data: row ? { ...row } : null, error: null };
      },
      then: (
        resolve: (value: { data: Row[] | null; error: { message: string } | null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => {
        const failed = this.blockedPatch(table, patch);
        if (failed) {
          patch = null;
          return Promise.resolve({ data: null, error: { message: failed } }).then(resolve, reject);
        }
        this.notePatch(table, patch);
        if (patch) for (const row of matched()) Object.assign(row, patch);
        patch = null;
        return Promise.resolve({ data: matched().map((row) => ({ ...row })), error: null }).then(resolve, reject);
      },
    };
    return api;
  }

  async rpc(
    fn: string,
    args: {
      p_match_id?: string;
      p_specialist_id?: string;
      p_request_offer_id?: string | null;
      p_claim_id?: string;
      p_decision?: string;
    },
  ) {
    if (fn === "apply_service_request_client_decision") {
      const claim = this.tables.service_request_claims?.find((row) => row.id === args.p_claim_id);
      const match = this.tables.service_request_matches?.find((row) => row.id === claim?.match_id);
      if (!claim || claim.status !== "reserved" || !match) return { data: { ok: false, error: "not_claimable" }, error: null };
      if (args.p_decision === "confirm" && typeof claim.client_confirmed_at === "string" && !claim.client_rejected_at) {
        return { data: { ok: true, at: claim.client_confirmed_at }, error: null };
      }
      if (args.p_decision === "reject" && typeof claim.client_rejected_at === "string" && !claim.client_confirmed_at) {
        return { data: { ok: true, at: claim.client_rejected_at }, error: null };
      }
      if (claim.client_confirmed_at || claim.client_rejected_at) return { data: { ok: false, error: "not_claimable" }, error: null };
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
      claim.updated_at = at;
      return { data: { ok: true, at }, error: null };
    }
    this.rpcCalls += 1;
    if (fn !== "reserve_service_request_claim") return { data: null, error: { message: "unknown rpc" } };
    const match = this.tables.service_request_matches?.find((row) => row.id === args.p_match_id);
    if (!match || match.specialist_id !== args.p_specialist_id) {
      return { data: { ok: false, error: "not_found" }, error: null };
    }
    if (match.status !== "active") return { data: { ok: false, error: "not_claimable" }, error: null };
    const claim = {
      id: crypto.randomUUID(),
      status: "reserved",
      specialist_id: args.p_specialist_id,
      service_request_id: match.service_request_id,
      match_id: match.id,
      request_offer_id: args.p_request_offer_id,
    };
    this.tables.service_request_claims.push(claim);
    return { data: { ok: true, claim_id: claim.id, changed: true }, error: null };
  }

  private blockedPatch(table: string, patch: Row | null): string | null {
    if (!patch) return null;
    if (this.failMatchClose && table === "service_request_matches" && patch.status === "not_selected") {
      this.failMatchClose = false;
      return "match close failed";
    }
    if (this.failClaimRelease && table === "service_request_claims" && patch.status === "released") {
      this.failClaimRelease = false;
      return "claim release failed";
    }
    return null;
  }

  private notePatch(table: string, patch: Row | null) {
    if (!patch) return;
    if (table === "service_request_matches" && patch.status === "not_selected") {
      this.order.push(`match-while-claim:${this.tables.service_request_claims?.[0]?.status}`);
    }
    if (table === "service_request_claims" && patch.status === "released") {
      this.order.push(`claim-while-match:${this.tables.service_request_matches?.[0]?.status}`);
    }
  }
}

function seed() {
  return new Memory({
    service_requests: [{
      id: REQUEST,
      public_id: PUBLIC_ID,
      client_user_id: CLIENT,
      selected_specialist_id: null,
      locale: "ru",
      requested_service: "коуч",
    }],
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
      confirmation_expires_at: DEADLINE,
      release_reason: null,
      released_at: null,
    }],
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
      idempotency_key: buildMatchedServiceRequestOfferIdempotencyKey({
        requestId: REQUEST,
        specialistId: SPEC,
      }),
    }],
    service_request_matches: [
      { id: MATCH, service_request_id: REQUEST, specialist_id: SPEC, status: "active" },
      { id: OTHER_MATCH, service_request_id: REQUEST, specialist_id: OTHER_SPEC, status: "active" },
    ],
    request_offer_payments: [{
      id: PAYMENT,
      offer_id: OFFER,
      specialist_id: SPEC,
      service_request_claim_id: CLAIM,
      amount_cents: 2500,
      currency: "eur",
      status: "authorized",
      stripe_payment_intent_id: "pi_auth",
      provider: "stripe",
      authorized_at: "2026-10-02T18:00:00.000Z",
    }],
    request_offer_access_grants: [],
    conversations: [],
    inbox_items: [{
      id: "inbox-1",
      dedupe_key: `claim:${CLAIM}:connection_confirmation_required`,
    }],
    notification_outbox: [{
      id: "out-1",
      inbox_item_id: "inbox-1",
      status: "pending",
      dedupe_key: `claim:${CLAIM}:connection_confirmation_required:email`,
    }],
  });
}

function stripeFor(status = "requires_capture") {
  const cancels: Array<{ id: string; reason: string; key: string }> = [];
  const captures: string[] = [];
  let current = status;
  let cancelFailures = 0;
  const stripe = {
    paymentIntents: {
      retrieve: async (id: string) => ({
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
      capture: async (id: string) => {
        captures.push(id);
        current = "succeeded";
        return { id, amount: 2500, currency: "eur", status: "succeeded", metadata: {} };
      },
      cancel: async (
        id: string,
        params: { cancellation_reason: "requested_by_customer" },
        options: { idempotencyKey: string },
      ) => {
        cancels.push({ id, reason: params.cancellation_reason, key: options.idempotencyKey });
        if (cancelFailures > 0) {
          cancelFailures -= 1;
          throw new Error("stripe unavailable");
        }
        current = "canceled";
        return { id, amount: 2500, currency: "eur", status: "canceled", metadata: {} };
      },
    },
  };
  return {
    stripe: stripe as ServiceRequestReleaseStripe & { paymentIntents: { capture: (id: string) => Promise<unknown> } },
    cancels,
    captures,
    failNextCancel() { cancelFailures += 1; },
    markSucceeded() { current = "succeeded"; },
  };
}

async function reject(
  db: Memory,
  stripe: ServiceRequestReleaseStripe,
  userId = CLIENT,
  env: NodeJS.ProcessEnv = PAID,
) {
  return rejectServiceRequestConnection({
    supabase: db as unknown as SupabaseClient,
    publicId: PUBLIC_ID,
    clientUserId: userId,
    env,
    stripe,
  });
}

function releasedClaim(db: Memory) {
  return db.tables.service_request_claims[0];
}

test("only the owning client can reject", async () => {
  const db = seed();
  const { stripe, cancels } = stripeFor();
  const result = await reject(db, stripe, OTHER);
  assert.deepEqual(result, { ok: false, error: "not_found" });
  assert.equal(cancels.length, 0);
  assert.equal(releasedClaim(db)?.status, "reserved");
  assert.equal(releasedClaim(db)?.client_rejected_at, null);
});

test("reject route and service ignore client-supplied decision fields", () => {
  const route = readFileSync(
    new URL("../../app/api/client/requests/[kind]/[id]/reject/route.ts", import.meta.url),
    "utf8",
  );
  const service = readFileSync(new URL("./rejectServiceRequestConnection.ts", import.meta.url), "utf8");
  const migration = readFileSync(
    new URL("../../supabase/manual_migrations/2026-10-02_service_request_client_rejection.sql", import.meta.url),
    "utf8",
  );
  assert.match(route, /resolveBearerAuthUser/);
  assert.equal(route.includes("request.json"), false);
  for (const field of ["specialistId", "claimId", "amountCents", "currency", "paymentIntentId", "releaseReason", "rejectedAt"]) {
    assert.equal(service.includes(`input.${field}`), false, field);
  }
  assert.equal(service.includes("paymentIntents.capture"), false);
  assert.equal(service.includes("connection_attempts"), false);
  assert.equal(service.includes("reserve_service_request_claim"), false);
  assert.match(migration, /client_rejected_at timestamptz NULL/);
  assert.match(migration, /client_confirmed_at IS NULL OR client_rejected_at IS NULL/);
  assert.equal(migration.includes("UPDATE public.service_request_claims"), false);
});

test("an authorized 25 euro connection is released without capture or rematch", async () => {
  const db = seed();
  const { stripe, cancels, captures } = stripeFor();
  const result = await reject(db, stripe, CLIENT, FLAGS);
  assert.deepEqual(result, { ok: true, state: "released" });
  assert.equal(captures.length, 0);
  assert.deepEqual(db.order, ["match-while-claim:reserved", "claim-while-match:not_selected"]);
  assert.equal(cancels.length, 1);
  assert.equal(cancels[0]?.key, serviceRequestReleaseIdempotencyKey(PAYMENT));
  assert.equal(cancels[0]?.reason, "requested_by_customer");
  const payment = db.tables.request_offer_payments[0];
  assert.equal(payment?.status, "released");
  assert.equal(typeof payment?.released_at, "string");
  assert.equal(payment?.amount_cents, 2500);
  const claim = releasedClaim(db);
  assert.equal(claim?.status, "released");
  assert.equal(typeof claim?.released_at, "string");
  assert.equal(claim?.release_reason, CLIENT_REJECTION_RELEASE_REASON);
  assert.equal(typeof claim?.client_rejected_at, "string");
  assert.equal(claim?.client_confirmed_at, null);
  assert.equal(claim?.confirmation_expires_at, DEADLINE);
  assert.equal(db.tables.service_request_matches[0]?.status, "not_selected");
  assert.equal(db.tables.service_request_matches[1]?.status, "active");
  assert.equal(db.tables.service_requests[0]?.selected_specialist_id, null);
  assert.equal(db.tables.request_offer_access_grants.length, 0);
  assert.equal(db.tables.conversations.length, 0);
  assert.equal(db.tables.service_request_claims.length, 1);
  assert.equal(db.tables.request_offers[0]?.price_cents, 2500);
  assert.equal(db.tables.inbox_items.length, 1);
  assert.equal(db.tables.notification_outbox[0]?.status, "cancelled");
  const again = await reject(db, stripe, CLIENT, FLAGS);
  assert.deepEqual(again, { ok: true, state: "released" });
  assert.equal(cancels.length, 1);
  assert.equal(claim?.release_reason, CLIENT_REJECTION_RELEASE_REASON);
  assert.equal(db.tables.service_request_matches[0]?.status, "not_selected");
});

test("confirmation after rejection does not capture", async () => {
  const db = seed();
  const gate = stripeFor();
  const rejected = await reject(db, gate.stripe);
  assert.equal(rejected.ok, true);
  const { stripe, captures } = stripeFor();
  const confirmed = await confirmServiceRequestConnection({
    supabase: db as unknown as SupabaseClient,
    publicId: PUBLIC_ID,
    clientUserId: CLIENT,
    env: FLAGS,
    stripe,
  });
  assert.deepEqual(confirmed, { ok: false, error: "not_claimable" });
  assert.equal(captures.length, 0);
  assert.equal(db.tables.request_offer_payments[0]?.status, "released");
});

test("rejection after confirmation does not cancel", async () => {
  const db = seed();
  releasedClaim(db).client_confirmed_at = "2026-10-02T18:05:00.000Z";
  const { stripe, cancels } = stripeFor();
  const result = await reject(db, stripe);
  assert.deepEqual(result, { ok: false, error: "not_claimable" });
  assert.equal(cancels.length, 0);
  assert.equal(releasedClaim(db)?.client_rejected_at, null);
  assert.equal(releasedClaim(db)?.status, "reserved");
  assert.equal(db.tables.request_offer_payments[0]?.status, "authorized");
});

test("racing confirm and reject cannot store both decisions", async () => {
  const db = seed();
  const gate = stripeFor();
  const [confirmed, rejected] = await Promise.all([
    confirmServiceRequestConnection({
      supabase: db as unknown as SupabaseClient,
      publicId: PUBLIC_ID,
      clientUserId: CLIENT,
      env: FLAGS,
      stripe: gate.stripe,
    }),
    reject(db, gate.stripe, CLIENT, FLAGS),
  ]);
  const claim = releasedClaim(db);
  const confirmedAt = typeof claim?.client_confirmed_at === "string" && claim.client_confirmed_at;
  const rejectedAt = typeof claim?.client_rejected_at === "string" && claim.client_rejected_at;
  assert.equal(Boolean(confirmedAt) && Boolean(rejectedAt), false);
  assert.equal(Boolean(confirmedAt) || Boolean(rejectedAt), true);
  assert.equal(gate.captures.length > 0 && gate.cancels.length > 0, false);
  assert.equal(confirmed.ok && rejected.ok, false);
});

test("a failed Stripe cancellation keeps the rejection and a retry finishes release", async () => {
  const db = seed();
  const gate = stripeFor();
  gate.failNextCancel();
  const first = await reject(db, gate.stripe, CLIENT, FLAGS);
  assert.deepEqual(first, { ok: false, error: "retryable" });
  assert.equal(typeof releasedClaim(db)?.client_rejected_at, "string");
  assert.equal(releasedClaim(db)?.client_confirmed_at, null);
  assert.equal(releasedClaim(db)?.status, "reserved");
  assert.equal(db.tables.request_offer_payments[0]?.status, "authorized");
  const confirmed = await confirmServiceRequestConnection({
    supabase: db as unknown as SupabaseClient,
    publicId: PUBLIC_ID,
    clientUserId: CLIENT,
    env: FLAGS,
    stripe: gate.stripe,
  });
  assert.deepEqual(confirmed, { ok: false, error: "not_claimable" });
  assert.equal(gate.captures.length, 0);
  assert.equal(
    await isServiceRequestClientConfirmationRequired({
      supabase: db as unknown as SupabaseClient,
      requestId: REQUEST,
      env: FLAGS,
      stripeConfigured: true,
    }),
    false,
  );
  const second = await reject(db, gate.stripe, CLIENT, FLAGS);
  assert.deepEqual(second, { ok: true, state: "released" });
  assert.equal(db.tables.request_offer_payments[0]?.status, "released");
  assert.equal(releasedClaim(db)?.status, "released");
  assert.equal(releasedClaim(db)?.release_reason, CLIENT_REJECTION_RELEASE_REASON);
  assert.equal(gate.captures.length, 0);
});

test("local release can resume after Stripe is already canceled", async () => {
  const db = seed();
  const gate = stripeFor();
  db.failClaimRelease = true;
  const first = await reject(db, gate.stripe);
  assert.deepEqual(first, { ok: false, error: "retryable" });
  assert.equal(gate.cancels.length, 1);
  assert.equal(db.tables.request_offer_payments[0]?.status, "released");
  assert.equal(releasedClaim(db)?.status, "reserved");
  assert.equal(db.tables.service_request_matches[0]?.status, "not_selected");
  assert.equal(typeof releasedClaim(db)?.client_rejected_at, "string");
  const second = await reject(db, gate.stripe);
  assert.deepEqual(second, { ok: true, state: "released" });
  assert.equal(gate.cancels.length, 1);
  assert.equal(releasedClaim(db)?.status, "released");
  assert.equal(releasedClaim(db)?.release_reason, CLIENT_REJECTION_RELEASE_REASON);
  assert.equal(db.tables.service_request_matches[0]?.status, "not_selected");
});

test("a historical release that is not this client rejection is not success", async () => {
  const db = seed();
  const claim = releasedClaim(db);
  claim.status = "released";
  claim.released_at = "2026-09-01T00:00:00.000Z";
  claim.release_reason = null;
  claim.client_rejected_at = null;
  const { stripe, cancels } = stripeFor();
  const result = await reject(db, stripe);
  assert.deepEqual(result, { ok: false, error: "not_claimable" });
  assert.equal(cancels.length, 0);
  assert.equal(claim.release_reason, null);
});

test("an existing authorization is released when the paid-claim flag is off", async () => {
  for (const env of [{}, { SERVICE_REQUEST_PAID_CLAIM_ENABLED: "false" }] as const) {
    const db = seed();
    const { stripe, cancels, captures } = stripeFor();
    const result = await reject(db, stripe, CLIENT, env);
    assert.deepEqual(result, { ok: true, state: "released" });
    assert.equal(cancels.length, 1);
    assert.equal(cancels[0]?.key, serviceRequestReleaseIdempotencyKey(PAYMENT));
    assert.equal(captures.length, 0);
    assert.equal(db.tables.request_offer_payments[0]?.status, "released");
    assert.equal(db.tables.request_offer_payments[0]?.amount_cents, 2500);
    assert.equal(db.tables.service_request_matches[0]?.status, "not_selected");
    assert.equal(db.tables.service_request_matches[1]?.status, "active");
    const claim = releasedClaim(db);
    assert.equal(claim?.status, "released");
    assert.equal(claim?.release_reason, CLIENT_REJECTION_RELEASE_REASON);
    assert.equal(db.tables.conversations.length, 0);
    assert.equal(db.tables.request_offer_access_grants.length, 0);
    assert.equal(db.tables.service_request_claims.length, 1);
    assert.equal(db.rpcCalls, 0);
  }
});

test("a durable rejection finishes cleanup when the paid-claim flag is off", async () => {
  const db = seed();
  const claim = releasedClaim(db);
  claim.client_rejected_at = "2026-10-02T18:20:00.000Z";
  const { stripe, cancels, captures } = stripeFor();
  const result = await reject(db, stripe, CLIENT, { SERVICE_REQUEST_PAID_CLAIM_ENABLED: "false" });
  assert.deepEqual(result, { ok: true, state: "released" });
  assert.equal(cancels.length, 1);
  assert.equal(captures.length, 0);
  assert.equal(db.tables.request_offer_payments[0]?.status, "released");
  assert.equal(db.tables.service_request_matches[0]?.status, "not_selected");
  assert.equal(claim.status, "released");
  assert.equal(claim.release_reason, CLIENT_REJECTION_RELEASE_REASON);
  assert.equal(db.tables.conversations.length, 0);
  assert.equal(db.tables.request_offer_access_grants.length, 0);
  assert.equal(db.tables.service_request_claims.length, 1);
});

test("a disabled paid-claim flag still blocks reservation and authorization", async () => {
  for (const env of [{}, { SERVICE_REQUEST_PAID_CLAIM_ENABLED: "false" }] as const) {
    const db = seed();
    const reserved = await reserveOwnMatch(
      db as unknown as SupabaseClient,
      { matchId: OTHER_MATCH, specialistId: OTHER_SPEC },
      env,
    );
    assert.deepEqual(reserved, { ok: false, error: "not_found" });
    assert.equal(db.rpcCalls, 0);
    assert.equal(db.tables.service_request_claims.length, 1);

    const authorized = await createServiceRequestAuthorization({
      supabase: db as unknown as SupabaseClient,
      claimId: CLAIM,
      specialistId: SPEC,
      userId: SPEC,
      env: { ...env, SERVICE_REQUEST_PAYMENT_AUTH_ENABLED: "true" },
      stripe: null,
    });
    assert.deepEqual(authorized, { ok: false, error: "not_found" });
    assert.equal(db.tables.service_request_claims.length, 1);
    assert.equal(db.tables.request_offer_payments.length, 1);
    assert.equal(db.tables.request_offer_payments[0]?.status, "authorized");
  }
});

test("missing confirmation window and a disabled capture flag still release an existing authorization", async () => {
  const db = seed();
  const { stripe, cancels, captures } = stripeFor();
  const result = await reject(db, stripe, CLIENT, PAID);
  assert.deepEqual(result, { ok: true, state: "released" });
  assert.equal(cancels.length, 1);
  assert.equal(captures.length, 0);
  assert.equal(db.tables.request_offer_payments[0]?.amount_cents, 2500);
  assert.equal(db.tables.request_offer_payments[0]?.status, "released");
});

test("retry completes claim release when the match is already not_selected", async () => {
  const db = seed();
  const claim = releasedClaim(db);
  claim.client_rejected_at = "2026-10-02T18:10:00.000Z";
  db.tables.request_offer_payments[0].status = "released";
  db.tables.request_offer_payments[0].released_at = "2026-10-02T18:10:01.000Z";
  db.tables.service_request_matches[0].status = "not_selected";
  const { stripe, cancels, captures } = stripeFor();
  const result = await reject(db, stripe);
  assert.deepEqual(result, { ok: true, state: "released" });
  assert.equal(cancels.length, 0);
  assert.equal(captures.length, 0);
  assert.equal(claim.status, "released");
  assert.equal(claim.release_reason, CLIENT_REJECTION_RELEASE_REASON);
  assert.equal(db.tables.service_request_matches[0]?.status, "not_selected");
  assert.equal(db.tables.service_request_matches[1]?.status, "active");
  assert.equal(db.tables.service_request_claims.length, 1);
  assert.equal(db.rpcCalls, 0);
});

test("a failed match close does not release the claim", async () => {
  const db = seed();
  db.failMatchClose = true;
  const { stripe, captures } = stripeFor();
  const result = await reject(db, stripe);
  assert.deepEqual(result, { ok: false, error: "retryable" });
  assert.equal(captures.length, 0);
  assert.equal(typeof releasedClaim(db)?.client_rejected_at, "string");
  assert.equal(releasedClaim(db)?.status, "reserved");
  assert.equal(releasedClaim(db)?.release_reason, null);
  assert.equal(db.tables.service_request_matches[0]?.status, "active");
  assert.equal(db.tables.service_request_matches[1]?.status, "active");
  assert.equal(db.tables.request_offer_payments[0]?.status, "released");
  assert.equal(db.tables.service_request_claims.length, 1);
  assert.equal(db.rpcCalls, 0);
});

test("the rejected match cannot be reserved again and no other specialist is rematched", async () => {
  const db = seed();
  const gate = stripeFor();
  const released = await reject(db, gate.stripe);
  assert.equal(released.ok, true);
  assert.equal(db.rpcCalls, 0);
  assert.equal(db.tables.service_request_claims.length, 1);
  assert.equal(db.tables.service_request_matches[1]?.status, "active");
  const again = await reserveOwnMatch(
    db as unknown as SupabaseClient,
    { matchId: MATCH, specialistId: SPEC },
    PAID,
  );
  assert.deepEqual(again, { ok: false, error: "not_claimable" });
  assert.equal(db.tables.service_request_claims.length, 1);
  assert.equal(db.tables.service_request_matches[0]?.status, "not_selected");
  assert.equal(db.tables.service_request_matches[1]?.status, "active");
  assert.equal(db.rpcCalls, 1);
  const reserveSql = readFileSync(
    new URL("../../supabase/manual_migrations/2026-09-29_service_request_payment_authorization.sql", import.meta.url),
    "utf8",
  );
  assert.match(reserveSql, /IF v_match\.status IS DISTINCT FROM 'active' THEN/);
});

test("a non-canonical amount is not released", async () => {
  const db = seed();
  db.tables.request_offer_payments[0].amount_cents = 4000;
  const { stripe, cancels } = stripeFor();
  const result = await reject(db, stripe);
  assert.deepEqual(result, { ok: false, error: "invariant" });
  assert.equal(cancels.length, 0);
  assert.equal(db.tables.request_offer_payments[0]?.status, "authorized");
  assert.equal(db.tables.request_offers[0]?.price_cents, 2500);
});
