import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildMatchedServiceRequestOfferIdempotencyKey } from "../leadEngine/requestOfferPolicy.ts";
import { PAID_REQUEST_ACCESS_CAPABILITY, PAID_REQUEST_STORE_PURCHASE_CAPABILITY } from "../nativeInstallations/capabilities.ts";
import { createServiceRequestAuthorization } from "./createServiceRequestAuthorization.ts";
import {
  confirmServiceRequestConnection,
  serviceRequestCaptureIdempotencyKey,
  type ServiceRequestCaptureStripe,
} from "./confirmServiceRequestConnection.ts";
import { processStripeWebhookEventForServiceRequestAuthorization } from "./processServiceRequestAuthorizationWebhook.ts";
import { notifyClientConfirmationRequired } from "@/lib/selection/interest";
import { renderClientEvent } from "@/lib/selection/render";
import { pushPathForEvent } from "@/lib/push/message";

const CLIENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OTHER = "99999999-9999-4999-8999-999999999999";
const SPEC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REQUEST = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MATCH = "11111111-1111-4111-8111-111111111111";
const OFFER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CLAIM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const PAYMENT = "12121212-1212-4121-8121-121212121212";
const PUBLIC_ID = "REQ-20260929-CONFIRM";
const FLAGS = {
  SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true",
  SERVICE_REQUEST_PAYMENT_AUTH_ENABLED: "true",
  SERVICE_REQUEST_CAPTURE_ENABLED: "true",
  SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: "900",
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

  async rpc(fn: string, args: { p_claim_id?: string; p_decision?: string }) {
    if (fn !== "apply_service_request_client_decision") {
      return { data: null, error: { message: "unknown rpc" } };
    }
    return { data: decide(this.tables, args.p_claim_id, args.p_decision), error: null };
  }
}

function decide(
  tables: Record<string, Row[]>,
  claimId: string | undefined,
  decision: string | undefined,
): { ok: boolean; at?: string; error?: string } {
  const claim = tables.service_request_claims?.find((row) => row.id === claimId);
  const match = tables.service_request_matches?.find((row) => row.id === claim?.match_id);
  if (!claim || claim.status !== "reserved" || !match) return { ok: false, error: "not_claimable" };
  if (decision === "confirm" && typeof claim.client_confirmed_at === "string" && !claim.client_rejected_at) {
    return { ok: true, at: claim.client_confirmed_at };
  }
  if (decision === "reject" && typeof claim.client_rejected_at === "string" && !claim.client_confirmed_at) {
    return { ok: true, at: claim.client_rejected_at };
  }
  if (claim.client_confirmed_at || claim.client_rejected_at) return { ok: false, error: "not_claimable" };
  const deadline = typeof claim.confirmation_expires_at === "string" ? Date.parse(claim.confirmation_expires_at) : Number.NaN;
  if (match.status === "expired" || (Number.isFinite(deadline) && deadline <= Date.now())) {
    return { ok: false, error: "confirmation_expired" };
  }
  if (decision === "confirm" && !Number.isFinite(deadline)) return { ok: false, error: "not_claimable" };
  if (match.status !== "active" && match.status !== "interested") return { ok: false, error: "not_claimable" };
  const at = new Date().toISOString();
  if (decision === "confirm") claim.client_confirmed_at = at;
  else if (decision === "reject") claim.client_rejected_at = at;
  else return { ok: false, error: "not_claimable" };
  claim.updated_at = at;
  return { ok: true, at };
}

function seed(overrides: { paymentStatus?: string; claimStatus?: string; selected?: string | null } = {}) {
  return new Memory({
    service_requests: [{
      id: REQUEST,
      public_id: PUBLIC_ID,
      client_user_id: CLIENT,
      selected_specialist_id: overrides.selected ?? null,
      locale: "ru",
      requested_service: "коуч",
    }],
    service_request_claims: [{
      id: CLAIM,
      status: overrides.claimStatus ?? "reserved",
      specialist_id: SPEC,
      service_request_id: REQUEST,
      match_id: MATCH,
      request_offer_id: OFFER,
      client_confirmed_at: null,
      confirmation_expires_at: "2099-01-01T00:00:00.000Z",
    }],
    request_offer_payments: [{
      id: PAYMENT,
      offer_id: OFFER,
      specialist_id: SPEC,
      service_request_claim_id: CLAIM,
      amount_cents: 2500,
      currency: "eur",
      status: overrides.paymentStatus ?? "authorized",
      stripe_payment_intent_id: "pi_auth",
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
    service_request_matches: [{
      id: MATCH,
      service_request_id: REQUEST,
      specialist_id: SPEC,
      status: "active",
    }],
    conversations: [],
    request_offer_access_grants: [],
    inbox_items: [],
    notification_outbox: [],
  });
}

function stripeFor(status = "requires_capture") {
  const captures: Array<{ id: string; params: Record<string, unknown>; key: string; confirmed: boolean }> = [];
  let current = status;
  const stripe: ServiceRequestCaptureStripe = {
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
      capture: async (id, params, options) => {
        captures.push({
          id,
          params,
          key: options.idempotencyKey,
          confirmed: true,
        });
        current = "succeeded";
        return { id, amount: 2500, currency: "eur", status: "succeeded", metadata: {} };
      },
    },
  };
  return { stripe, captures, markSucceeded: () => { current = "succeeded"; } };
}

async function confirm(db: Memory, stripe: ServiceRequestCaptureStripe, userId = CLIENT, env: NodeJS.ProcessEnv = FLAGS) {
  return confirmServiceRequestConnection({
    supabase: db as unknown as SupabaseClient,
    publicId: PUBLIC_ID,
    clientUserId: userId,
    env,
    stripe,
  });
}

test("confirmation before the deadline captures and after the deadline does not", async () => {
  const open = seed();
  const { stripe: openStripe, captures: openCaptures } = stripeFor();
  const confirmed = await confirm(open, openStripe, CLIENT, FLAGS);
  assert.equal(confirmed.ok, true);
  assert.equal(openCaptures.length, 1);
  assert.equal(open.tables.request_offers[0]?.price_cents, 2500);

  const expired = seed();
  expired.tables.service_request_claims[0].confirmation_expires_at = "2000-01-01T00:00:00.000Z";
  const { stripe: expiredStripe, captures } = stripeFor();
  const result = await confirm(expired, expiredStripe, CLIENT, {
    ...FLAGS,
    SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: "30",
  });
  assert.deepEqual(result, { ok: false, error: "confirmation_expired" });
  assert.equal(captures.length, 0);
  assert.equal(expired.tables.service_request_claims[0]?.client_confirmed_at, null);
  assert.equal(expired.tables.request_offer_payments[0]?.status, "authorized");
  assert.equal(expired.tables.request_offer_payments[0]?.amount_cents, 2500);
});

test("a canonical authorization without a deadline cannot be captured", async () => {
  const db = seed();
  db.tables.service_request_claims[0].confirmation_expires_at = null;
  const { stripe, captures } = stripeFor();
  const result = await confirm(db, stripe);
  assert.deepEqual(result, { ok: false, error: "confirmation_deadline_missing" });
  assert.equal(captures.length, 0);
  assert.equal(db.tables.service_request_claims[0]?.client_confirmed_at, null);
  assert.equal(db.tables.service_request_claims[0]?.status, "reserved");
});

test("confirmation does not capture a live offer amount other than 2500", async () => {
  const db = seed();
  db.tables.request_offers[0].price_cents = 4000;
  db.tables.request_offer_payments[0].amount_cents = 4000;
  const { stripe, captures } = stripeFor();
  const result = await confirm(db, stripe, CLIENT, FLAGS);
  assert.deepEqual(result, { ok: false, error: "invariant" });
  assert.equal(captures.length, 0);
  assert.equal(db.tables.service_request_claims[0]?.client_confirmed_at, null);
  assert.equal(db.tables.request_offers[0]?.price_cents, 4000);
  assert.equal(db.tables.request_offer_payments[0]?.status, "authorized");
  assert.equal(db.tables.request_offer_payments[0]?.amount_cents, 4000);
});

test("capture flag off makes confirmation unavailable and sends no notice", async () => {
  const db = seed();
  const { stripe, captures } = stripeFor();
  const closed = await confirm(db, stripe, CLIENT, {
    SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true",
    SERVICE_REQUEST_PAYMENT_AUTH_ENABLED: "true",
  });
  assert.deepEqual(closed, { ok: false, error: "not_found" });
  assert.equal(captures.length, 0);
  assert.equal(db.tables.inbox_items.length, 0);
  assert.equal(db.tables.service_request_claims[0]?.client_confirmed_at, null);
});

test("another authenticated client cannot see the request", async () => {
  const db = seed();
  const { stripe, captures } = stripeFor();
  const result = await confirm(db, stripe, OTHER);
  assert.deepEqual(result, { ok: false, error: "not_found" });
  assert.equal(captures.length, 0);
  assert.equal(JSON.stringify(result).includes(SPEC), false);
  assert.equal(JSON.stringify(result).includes(PUBLIC_ID), false);
});

test("pending, terminal, and already selected requests do not capture", async () => {
  const pending = seed({ paymentStatus: "pending" });
  const pendingStripe = stripeFor();
  assert.deepEqual(await confirm(pending, pendingStripe.stripe), { ok: false, error: "not_claimable" });
  assert.equal(pendingStripe.captures.length, 0);

  for (const status of ["released", "expired", "failed"] as const) {
    const db = seed({ claimStatus: status });
    const local = stripeFor();
    assert.equal((await confirm(db, local.stripe)).ok, false);
    assert.equal(local.captures.length, 0);
    assert.equal(db.tables.conversations.length, 0);
  }

  const taken = seed({ selected: "abababab-abab-4aba-8aba-abababababab" });
  const takenStripe = stripeFor();
  assert.deepEqual(await confirm(taken, takenStripe.stripe), { ok: false, error: "already_claimed" });
  assert.equal(takenStripe.captures.length, 0);
});

test("an incoherent offer does not capture", async () => {
  const db = seed();
  db.tables.request_offers[0].billing_model = "subscription";
  const { stripe, captures } = stripeFor();
  assert.deepEqual(await confirm(db, stripe), { ok: false, error: "invariant" });
  assert.equal(captures.length, 0);
  assert.equal(db.tables.service_request_claims[0]?.client_confirmed_at, null);
});

test("confirmation captures the stored intent once per idempotency key and does not fulfill", async () => {
  const db = seed();
  const { stripe, captures } = stripeFor();
  const first = await confirm(db, stripe);
  const second = await confirm(db, stripe);
  assert.deepEqual(first, { ok: true, state: "capture_pending" });
  assert.deepEqual(second, { ok: true, state: "capture_pending" });
  assert.equal(typeof db.tables.service_request_claims[0]?.client_confirmed_at, "string");
  assert.equal(db.tables.service_request_claims[0]?.status, "reserved");
  assert.equal(db.tables.request_offer_payments.length, 1);
  assert.equal(db.tables.request_offer_payments[0]?.status, "authorized");
  assert.equal(db.tables.service_request_claims[0]?.payment_rail, "stripe");
  assert.equal(db.tables.request_offer_access_grants.length, 0);
  assert.equal(db.tables.conversations.length, 0);
  assert.deepEqual(captures.map((call) => call.id), ["pi_auth"]);
  assert.deepEqual(captures.map((call) => call.params), [{}]);
  assert.equal(captures[0]?.key, serviceRequestCaptureIdempotencyKey(PAYMENT));
});

test("an already succeeded intent is not captured again", async () => {
  const db = seed();
  db.tables.service_request_claims[0].client_confirmed_at = "2026-09-29T18:00:00.000Z";
  const { stripe, captures } = stripeFor("succeeded");
  const result = await confirm(db, stripe);
  assert.deepEqual(result, { ok: true, state: "capture_pending" });
  assert.equal(captures.length, 0);
  assert.equal(db.tables.conversations.length, 0);
  assert.equal(db.tables.request_offer_access_grants.length, 0);
});

test("confirmation copy and route do not accept client money fields", () => {
  assert.equal(
    renderClientEvent("ru", "connection_confirmation_required", {}).title,
    "Специалист готов принять вашу заявку. Подтвердите соединение.",
  );
  assert.equal(
    renderClientEvent("ua", "connection_confirmation_required", {}).title,
    "Спеціаліст готовий прийняти вашу заявку. Підтвердьте з’єднання.",
  );
  assert.match(renderClientEvent("de", "connection_confirmation_required", {}).title, /Bestätigen Sie die Verbindung/);
  assert.match(renderClientEvent("en", "connection_confirmation_required", {}).title, /Confirm the connection/);
  assert.equal(
    pushPathForEvent({ locale: "ru", eventType: "connection_confirmation_required", publicId: PUBLIC_ID }),
    `/ru/requests/${PUBLIC_ID}`,
  );
  const route = readFileSync(
    new URL("../../app/api/client/requests/[kind]/[id]/confirm/route.ts", import.meta.url),
    "utf8",
  );
  const service = readFileSync(new URL("./confirmServiceRequestConnection.ts", import.meta.url), "utf8");
  const claim = readFileSync(
    new URL("../../app/api/specialist/matches/[matchId]/claim/route.ts", import.meta.url),
    "utf8",
  );
  const checkout = readFileSync(new URL("./processRequestOfferWebhook.ts", import.meta.url), "utf8");
  assert.match(route, /resolveBearerAuthUser/);
  assert.equal(route.includes("request.json"), false);
  assert.equal(service.includes("amount_to_capture"), false);
  assert.equal(service.includes("finalizeServiceRequestConnection"), false);
  assert.match(claim, /claimOwnMatch/);
  assert.equal(claim.includes("SERVICE_REQUEST_CAPTURE_ENABLED"), false);
  assert.equal(checkout.includes("client_confirmed_at"), false);
  assert.match(checkout, /checkout\.session\.completed/);
});

test("one confirmation notice is shared by both authorization paths", async () => {
  const db = seed({ paymentStatus: "pending" });
  db.tables.request_offer_payments[0].stripe_payment_intent_id = null;
  db.tables.service_request_claims[0].confirmation_expires_at = null;
  const created = await createServiceRequestAuthorization({
    supabase: db as unknown as SupabaseClient,
    claimId: CLAIM,
    specialistId: SPEC,
    userId: OTHER,
    env: FLAGS,
    stripe: {
      paymentIntents: {
        create: async () => ({
          id: "pi_auth",
          amount: 2500,
          currency: "eur",
          status: "requires_capture",
          client_secret: "secret",
        }),
        retrieve: async (id) => ({
          id,
          amount: 2500,
          currency: "eur",
          status: "requires_capture",
          client_secret: "secret",
        }),
      },
    },
    resolveCustomer: async () => "cus_test",
  });
  assert.equal(created.ok, true);
  if (!created.ok || created.state !== "authorized") return;
  const deadline = db.tables.service_request_claims[0]?.confirmation_expires_at;
  assert.equal(created.confirmationExpiresAt, deadline);
  assert.equal(created.amountCents, 2500);
  await processStripeWebhookEventForServiceRequestAuthorization(
    db as unknown as SupabaseClient,
    {
      id: "evt_cap",
      type: "payment_intent.amount_capturable_updated",
      data: {
        object: {
          id: "pi_auth",
          object: "payment_intent",
          amount: 2500,
          currency: "eur",
          status: "requires_capture",
          metadata: {
            purpose: "service_request_access_authorization",
            payment_id: String(db.tables.request_offer_payments[0]?.id),
            offer_id: OFFER,
            claim_id: CLAIM,
            specialist_id: SPEC,
          },
        },
      },
    } as never,
    { ...FLAGS, SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: "30" },
  );
  assert.equal(db.tables.service_request_claims[0]?.confirmation_expires_at, deadline);
  await notifyClientConfirmationRequired(db as unknown as SupabaseClient, CLAIM);
  const notices = db.tables.inbox_items.filter((row) => row.type === "connection_confirmation_required");
  assert.equal(notices.length, 1);
  assert.equal(notices[0]?.dedupe_key, `claim:${CLAIM}:connection_confirmation_required`);
  assert.equal(JSON.stringify(notices[0]?.payload).includes("pi_auth"), false);
  assert.equal(JSON.stringify(notices[0]?.payload).includes("secret"), false);
  assert.equal(db.tables.conversations.length, 0);
});

const SPEC_USER = "88888888-8888-4888-8888-888888888888";
const STORE_ON = {
  SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true",
  SERVICE_REQUEST_STORE_PAYMENT_ENABLED: "true",
};

function readyStore(db: Memory, capabilities: string[] = [PAID_REQUEST_STORE_PURCHASE_CAPABILITY], active = true, installationUserId = SPEC_USER) {
  db.tables.request_offer_payments = [];
  db.tables.service_request_claims[0].payment_rail = "store";
  db.tables.specialists = [{ id: SPEC, user_id: SPEC_USER }];
  db.tables.native_installations = [{ user_id: installationUserId, active, capabilities }];
}

test("store confirmation stays closed unless the flag and purchase capability are both present", async () => {
  const closed = seed();
  readyStore(closed);
  const noFlag = await confirm(closed, stripeFor().stripe, CLIENT, {
    SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true",
  });
  assert.deepEqual(noFlag, { ok: false, error: "not_found" });
  assert.equal(closed.tables.service_request_claims[0]?.client_confirmed_at, null);

  const noCapability = seed();
  readyStore(noCapability, [PAID_REQUEST_ACCESS_CAPABILITY]);
  assert.deepEqual(await confirm(noCapability, stripeFor().stripe, CLIENT, STORE_ON), { ok: false, error: "not_found" });
  assert.equal(noCapability.tables.service_request_claims[0]?.client_confirmed_at, null);

  const flagOff = seed();
  readyStore(flagOff);
  assert.deepEqual(await confirm(flagOff, stripeFor().stripe, CLIENT, {
    SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true",
    SERVICE_REQUEST_STORE_PAYMENT_ENABLED: "false",
  }), { ok: false, error: "not_found" });

  const inactive = seed();
  readyStore(inactive, [PAID_REQUEST_STORE_PURCHASE_CAPABILITY], false);
  assert.deepEqual(await confirm(inactive, stripeFor().stripe, CLIENT, STORE_ON), { ok: false, error: "not_found" });

  const otherUser = seed();
  readyStore(otherUser, [PAID_REQUEST_STORE_PURCHASE_CAPABILITY], true, OTHER);
  assert.deepEqual(await confirm(otherUser, stripeFor().stripe, CLIENT, STORE_ON), { ok: false, error: "not_found" });
});

test("store-ready confirmation records the client decision and does not charge", async () => {
  const db = seed();
  readyStore(db);
  const { stripe, captures } = stripeFor();
  const first = await confirm(db, stripe, CLIENT, STORE_ON);
  const confirmedAt = db.tables.service_request_claims[0]?.client_confirmed_at;
  const second = await confirm(db, stripe, CLIENT, STORE_ON);
  assert.deepEqual(first, { ok: true, state: "payment_required" });
  assert.deepEqual(second, { ok: true, state: "payment_required" });
  assert.equal(db.tables.service_request_claims[0]?.client_confirmed_at, confirmedAt);
  assert.equal(db.tables.service_request_claims[0]?.status, "reserved");
  assert.equal(db.tables.request_offer_payments.length, 0);
  assert.equal(db.tables.request_offer_access_grants.length, 0);
  assert.equal(db.tables.conversations.length, 0);
  assert.equal(db.tables.service_requests[0]?.selected_specialist_id, null);
  assert.equal(db.tables.request_offers[0]?.price_cents, 2500);
  assert.equal(captures.length, 0);
  assert.equal(db.tables.inbox_items.length, 0);
});

test("store confirmation records without a stripe deadline and does not charge", async () => {
  const db = seed();
  readyStore(db);
  db.tables.service_request_claims[0].confirmation_expires_at = null;
  const { stripe, captures } = stripeFor();
  const result = await confirm(db, stripe, CLIENT, STORE_ON);
  assert.deepEqual(result, { ok: true, state: "payment_required" });
  assert.equal(typeof db.tables.service_request_claims[0]?.client_confirmed_at, "string");
  assert.equal(db.tables.service_request_claims[0]?.status, "reserved");
  assert.equal(db.tables.service_request_matches[0]?.status, "active");
  assert.equal(db.tables.request_offer_payments.length, 0);
  assert.equal(captures.length, 0);
});

test("an in-flight or settled payment never opens the store confirmation branch", async () => {
  const stripeAndStore = { ...FLAGS, SERVICE_REQUEST_STORE_PAYMENT_ENABLED: "true" };
  const pending = seed({ paymentStatus: "pending" });
  assert.deepEqual(await confirm(pending, stripeFor().stripe, CLIENT, stripeAndStore), { ok: false, error: "not_claimable" });
  assert.equal(pending.tables.service_request_claims[0]?.client_confirmed_at, null);
  assert.equal(pending.tables.service_request_claims[0]?.payment_rail, "stripe");
  assert.equal(pending.tables.request_offer_payments.length, 1);

  const paid = seed({ paymentStatus: "paid" });
  assert.deepEqual(await confirm(paid, stripeFor().stripe, CLIENT, stripeAndStore), { ok: true, state: "capture_pending" });
  assert.equal(paid.tables.service_request_claims[0]?.payment_rail, "stripe");
  assert.equal(paid.tables.request_offer_access_grants.length, 0);
  assert.equal(paid.tables.conversations.length, 0);
  assert.equal(paid.tables.request_offer_payments.length, 1);

  const storePaid = seed({ paymentStatus: "paid" });
  storePaid.tables.service_request_claims[0].payment_rail = "store";
  assert.deepEqual(await confirm(storePaid, stripeFor().stripe, CLIENT, STORE_ON), { ok: false, error: "not_claimable" });
  assert.notEqual(storePaid.tables.service_request_claims[0]?.payment_rail, "stripe");

  const granted = seed();
  readyStore(granted);
  granted.tables.request_offer_access_grants = [{
    id: "grant-1",
    offer_id: OFFER,
    specialist_id: SPEC,
    revoked_at: null,
  }];
  assert.deepEqual(await confirm(granted, stripeFor().stripe, CLIENT, STORE_ON), { ok: true, state: "capture_pending" });
  assert.equal(granted.tables.service_request_claims[0]?.client_confirmed_at, null);
  assert.equal(granted.tables.request_offer_payments.length, 0);
});

test("a NULL rail does not become store from account capability", async () => {
  const db = seed();
  readyStore(db);
  db.tables.service_request_claims[0].payment_rail = null;
  assert.deepEqual(await confirm(db, stripeFor().stripe, CLIENT, STORE_ON), { ok: false, error: "not_claimable" });
  assert.equal(db.tables.service_request_claims[0]?.client_confirmed_at, null);
  assert.equal(db.tables.service_request_claims[0]?.payment_rail, null);
  assert.equal(db.tables.request_offer_payments.length, 0);
});

test("store flag and purchase capability do not change authorized Stripe capture", async () => {
  const db = seed();
  db.tables.service_request_claims[0].payment_rail = "stripe";
  db.tables.specialists = [{ id: SPEC, user_id: SPEC_USER }];
  db.tables.native_installations = [{
    user_id: SPEC_USER,
    active: true,
    capabilities: [PAID_REQUEST_ACCESS_CAPABILITY, PAID_REQUEST_STORE_PURCHASE_CAPABILITY],
  }];
  const { stripe, captures } = stripeFor();
  const result = await confirm(db, stripe, CLIENT, {
    ...FLAGS,
    SERVICE_REQUEST_STORE_PAYMENT_ENABLED: "true",
  });
  assert.deepEqual(result, { ok: true, state: "capture_pending" });
  assert.deepEqual(captures.map((call) => call.id), ["pi_auth"]);
  assert.equal(captures[0]?.key, serviceRequestCaptureIdempotencyKey(PAYMENT));
  assert.equal(db.tables.service_request_claims[0]?.payment_rail, "stripe");
  assert.equal(db.tables.request_offer_access_grants.length, 0);
  assert.equal(db.tables.conversations.length, 0);
});

test("a completed claim stays connected and a terminal claim is not confirmed", async () => {
  const done = seed({ claimStatus: "completed", selected: SPEC });
  done.tables.conversations = [{ id: "conversation-1", service_request_id: REQUEST }];
  const connected = await confirm(done, stripeFor().stripe);
  assert.deepEqual(connected, { ok: true, state: "connected", conversationId: "conversation-1" });
  assert.equal(done.tables.conversations.length, 1);

  for (const status of ["released", "expired", "failed"] as const) {
    const db = seed({ claimStatus: status });
    readyStore(db);
    const result = await confirm(db, stripeFor().stripe, CLIENT, STORE_ON);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "not_claimable");
    assert.equal(db.tables.conversations.length, 0);
    assert.equal(db.tables.service_request_claims[0]?.client_confirmed_at, null);
  }
});

test("Stripe auth and capture flags still close the authorized branch", async () => {
  const authOff = seed();
  const closedAuth = await confirm(authOff, stripeFor().stripe, CLIENT, {
    SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true",
    SERVICE_REQUEST_CAPTURE_ENABLED: "true",
  });
  assert.deepEqual(closedAuth, { ok: false, error: "not_found" });
  assert.equal(authOff.tables.service_request_claims[0]?.client_confirmed_at, null);
});
