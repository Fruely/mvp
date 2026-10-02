import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

import { processStripeWebhookEventForServiceRequestAuthorization } from "./processServiceRequestAuthorizationWebhook.ts";
import {
  shouldMarkServiceRequestAuthorizationBillingEventSkipped,
  shouldRetryBillingWebhook,
} from "./processStripeBillingWebhook.ts";

const PAYMENT = "12121212-1212-4121-8121-121212121212";
const CLAIM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OFFER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const SPEC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REQUEST = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

type Row = Record<string, unknown>;

class Memory {
  readonly tables: Record<string, Row[]>;
  readonly writes: string[] = [];

  constructor(seed: Record<string, Row[]>) {
    this.tables = {};
    for (const [name, rows] of Object.entries(seed)) this.tables[name] = rows.map((row) => ({ ...row }));
  }

  from(table: string) {
    this.writes.push(table);
    const filters: Array<(row: Row) => boolean> = [];
    let patch: Row | null = null;
    const matched = () => (this.tables[table] ?? []).filter((row) => filters.every((filter) => filter(row)));
    const api = {
      select() {
        return api;
      },
      eq(column: string, value: unknown) {
        filters.push((row) => row[column] === value);
        return api;
      },
      in(column: string, values: unknown[]) {
        filters.push((row) => values.includes(row[column]));
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
      insert(row: Row) {
        this.tables[table] = [...(this.tables[table] ?? []), row];
        return api;
      },
      maybeSingle: async () => ({ data: matched()[0] ?? null, error: null }),
      then: (
        resolve: (value: { data: Row[]; error: null }) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => {
        if (patch) {
          for (const row of matched()) Object.assign(row, patch);
        }
        return Promise.resolve({ data: matched().map((row) => ({ ...row })), error: null as null }).then(
          resolve,
          reject,
        );
      },
    };
    return api;
  }
}

function db() {
  return new Memory({
    request_offer_payments: [
      {
        id: PAYMENT,
        offer_id: OFFER,
        specialist_id: SPEC,
        service_request_claim_id: CLAIM,
        amount_cents: 2500,
        currency: "eur",
        status: "pending",
        stripe_payment_intent_id: "pi_auth",
      },
    ],
    service_request_claims: [
      {
        id: CLAIM,
        specialist_id: SPEC,
        service_request_id: REQUEST,
        request_offer_id: OFFER,
        status: "reserved",
      },
    ],
    request_offers: [
      {
        id: OFFER,
        request_kind: "service_request",
        service_request_id: REQUEST,
        specialist_id: SPEC,
      },
    ],
    request_offer_access_grants: [],
    conversations: [],
  });
}

function event(
  type: string,
  overrides: Record<string, unknown> = {},
  metadata: Record<string, string> = {},
): Stripe.Event {
  return {
    id: "evt_auth",
    type,
    data: {
      object: {
        id: "pi_auth",
        object: "payment_intent",
        amount: 2500,
        currency: "eur",
        status:
          type === "payment_intent.succeeded"
            ? "succeeded"
            : type === "payment_intent.canceled"
              ? "canceled"
              : type === "payment_intent.payment_failed"
                ? "requires_payment_method"
                : "requires_capture",
        metadata: {
          purpose: "service_request_access_authorization",
          payment_id: PAYMENT,
          offer_id: OFFER,
          claim_id: CLAIM,
          specialist_id: SPEC,
          ...metadata,
        },
        ...overrides,
      },
    },
  } as unknown as Stripe.Event;
}

const WINDOW = { SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: "900" };

async function run(
  database: Memory,
  stripeEvent: Stripe.Event,
  env: NodeJS.ProcessEnv = WINDOW,
) {
  return processStripeWebhookEventForServiceRequestAuthorization(
    database as unknown as SupabaseClient,
    stripeEvent,
    env,
  );
}

test("amount_capturable_updated with requires_capture authorizes once", async () => {
  const database = db();
  const first = await run(database, event("payment_intent.amount_capturable_updated"));
  const authorizedAt = database.tables.request_offer_payments[0]?.authorized_at;
  const second = await run(database, event("payment_intent.amount_capturable_updated"));
  assert.deepEqual(first, { outcome: "success" });
  assert.deepEqual(second, { outcome: "success" });
  assert.equal(database.tables.request_offer_payments[0]?.status, "authorized");
  assert.equal(database.tables.request_offer_payments[0]?.authorized_at, authorizedAt);
  assert.equal(database.tables.service_request_claims[0]?.status, "reserved");
  assert.equal(database.tables.request_offer_access_grants.length, 0);
  assert.equal(database.tables.conversations.length, 0);
  assert.equal(database.writes.includes("request_offer_access_grants"), false);
  assert.equal(database.writes.includes("conversations"), false);
});

test("webhook authorization persists one deadline and a later window does not extend it", async () => {
  const database = db();
  const first = await run(database, event("payment_intent.amount_capturable_updated"));
  const expires = database.tables.service_request_claims[0]?.confirmation_expires_at;
  const authorizedAt = database.tables.request_offer_payments[0]?.authorized_at;
  assert.deepEqual(first, { outcome: "success" });
  assert.equal(Date.parse(String(expires)) - Date.parse(String(authorizedAt)), 900_000);
  const second = await run(database, event("payment_intent.amount_capturable_updated"), {
    SERVICE_REQUEST_CONFIRMATION_WINDOW_SECONDS: "30",
  });
  assert.deepEqual(second, { outcome: "success" });
  assert.equal(database.tables.service_request_claims[0]?.confirmation_expires_at, expires);
  assert.equal(database.tables.request_offer_payments[0]?.authorized_at, authorizedAt);
  assert.equal(database.tables.request_offer_payments[0]?.status, "authorized");
  assert.equal(database.tables.service_request_claims[0]?.status, "reserved");
});

test("webhook does not authorize when the confirmation window is not configured", async () => {
  const database = db();
  database.tables.service_requests = [{
    id: REQUEST,
    public_id: "REQ-1",
    client_user_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    client_email: "client@example.com",
    locale: "de",
    requested_service: "coach",
  }];
  const result = await run(database, event("payment_intent.amount_capturable_updated"), {
    SERVICE_REQUEST_CAPTURE_ENABLED: "true",
  });
  assert.deepEqual(result, { outcome: "retryable_failure" });
  assert.equal(database.tables.request_offer_payments[0]?.status, "pending");
  assert.equal(database.tables.request_offer_payments[0]?.authorized_at, undefined);
  assert.equal(database.tables.service_request_claims[0]?.confirmation_expires_at, undefined);
  assert.equal(database.writes.includes("inbox_items"), false);
  assert.equal(database.writes.includes("notification_outbox"), false);
  assert.equal(database.tables.conversations.length, 0);
  assert.equal(database.tables.request_offer_access_grants.length, 0);
  assert.equal(shouldMarkServiceRequestAuthorizationBillingEventSkipped(result), false);
  assert.equal(
    shouldRetryBillingWebhook({
      eventType: "payment_intent.amount_capturable_updated",
      partner: { eventType: "payment_intent.amount_capturable_updated", partnerCommission: null },
      planPayment: { outcome: "ignored" },
      promoted: { outcome: "ignored" },
      promotedReservation: { outcome: "ignored" },
      requestOffer: { outcome: "ignored" },
      serviceRequestAuthorization: result,
      subscription: { outcome: "ignored", logCode: "ignored" },
    }),
    true,
  );
});

test("a persisted amount other than 2500 cannot be authorized by webhook", async () => {
  const database = db();
  database.tables.request_offer_payments[0].amount_cents = 4000;
  const result = await run(database, event("payment_intent.amount_capturable_updated", { amount: 4000 }));
  assert.deepEqual(result, { outcome: "validation_failed" });
  assert.equal(database.tables.request_offer_payments[0]?.status, "pending");
  assert.equal(database.tables.request_offer_payments[0]?.amount_cents, 4000);
  assert.equal(database.tables.request_offer_payments[0]?.authorized_at, undefined);
});

test("wrong amount, currency, or claim relation fails validation", async () => {
  for (const stripeEvent of [
    event("payment_intent.amount_capturable_updated", { amount: 100 }),
    event("payment_intent.amount_capturable_updated", { currency: "usd" }),
    event("payment_intent.amount_capturable_updated", {}, { claim_id: "abababab-abab-4aba-8aba-abababababab" }),
    event("payment_intent.amount_capturable_updated", {}, { offer_id: "abababab-abab-4aba-8aba-abababababab" }),
  ]) {
    const database = db();
    const result = await run(database, stripeEvent);
    assert.deepEqual(result, { outcome: "validation_failed" });
    assert.equal(database.tables.request_offer_payments[0]?.status, "pending");
    assert.equal(database.tables.service_request_claims[0]?.status, "reserved");
  }
});

test("a declined confirmation leaves the same pending payment retryable", async () => {
  const database = db();
  const before = database.tables.request_offer_payments[0];
  assert.deepEqual(
    await run(database, event("payment_intent.payment_failed")),
    { outcome: "success" },
  );
  assert.equal(database.tables.request_offer_payments.length, 1);
  assert.equal(database.tables.request_offer_payments[0]?.status, "pending");
  assert.equal(database.tables.request_offer_payments[0]?.stripe_payment_intent_id, "pi_auth");
  assert.equal(database.tables.request_offer_payments[0]?.failed_at, undefined);
  assert.equal(database.tables.request_offer_payments[0]?.id, before?.id);
  assert.equal(database.tables.service_request_claims[0]?.status, "reserved");

  database.tables.request_offer_payments[0].stripe_payment_intent_id = null;
  assert.deepEqual(
    await run(database, event("payment_intent.payment_failed")),
    { outcome: "success" },
  );
  assert.equal(database.tables.request_offer_payments[0]?.status, "pending");
  assert.equal(database.tables.request_offer_payments[0]?.stripe_payment_intent_id, "pi_auth");
  assert.equal(database.tables.request_offer_payments[0]?.failed_at, undefined);
});

test("authorization requires a reserved claim and does not reopen a closed one", async () => {
  for (const status of ["released", "expired", "failed"] as const) {
    const database = db();
    database.tables.service_request_claims[0].status = status;
    const result = await run(database, event("payment_intent.amount_capturable_updated"));
    assert.deepEqual(result, { outcome: "validation_failed" });
    assert.equal(database.tables.request_offer_payments[0]?.status, "pending");
    assert.equal(database.tables.request_offer_payments[0]?.authorized_at, undefined);
    assert.equal(database.tables.service_request_claims[0]?.status, status);
  }

  const reserved = db();
  assert.deepEqual(
    await run(reserved, event("payment_intent.amount_capturable_updated")),
    { outcome: "success" },
  );
  assert.equal(reserved.tables.request_offer_payments[0]?.status, "authorized");
  assert.equal(reserved.tables.service_request_claims[0]?.status, "reserved");
});

test("cancellation can release the payment without reviving the claim", async () => {
  const database = db();
  database.tables.service_request_claims[0].status = "released";
  assert.deepEqual(await run(database, event("payment_intent.canceled")), { outcome: "success" });
  assert.equal(database.tables.request_offer_payments[0]?.status, "released");
  assert.equal(typeof database.tables.request_offer_payments[0]?.released_at, "string");
  assert.equal(database.tables.service_request_claims[0]?.status, "released");
  assert.equal(database.writes.includes("conversations"), false);
});

test("an already paid event stays idempotent after the claim is completed", async () => {
  const database = db();
  database.tables.request_offer_payments[0].status = "paid";
  database.tables.request_offer_payments[0].paid_at = "2026-09-29T12:00:00.000Z";
  database.tables.service_request_claims[0].status = "completed";
  assert.deepEqual(await run(database, event("payment_intent.succeeded")), { outcome: "success" });
  assert.equal(database.tables.request_offer_payments[0]?.status, "paid");
  assert.equal(database.tables.request_offer_payments[0]?.paid_at, "2026-09-29T12:00:00.000Z");
  assert.equal(database.tables.service_request_claims[0]?.status, "completed");
  assert.equal(database.tables.request_offer_access_grants.length, 0);
  assert.equal(database.tables.conversations.length, 0);
});

test("succeeded without client confirmation does not pay, grant, or open chat", async () => {
  const paid = db();
  assert.deepEqual(await run(paid, event("payment_intent.succeeded")), { outcome: "validation_failed" });
  assert.equal(paid.tables.request_offer_payments[0]?.status, "pending");
  assert.equal(paid.tables.service_request_claims[0]?.status, "reserved");
  assert.equal(paid.tables.request_offer_access_grants.length, 0);
  assert.equal(paid.tables.conversations.length, 0);
  assert.equal(paid.writes.includes("request_offer_access_grants"), false);
  assert.equal(paid.writes.includes("conversations"), false);
});

test("authorization webhook does not capture from the webhook handler", () => {
  const source = readFileSync(new URL("./processServiceRequestAuthorizationWebhook.ts", import.meta.url), "utf8");
  const aggregate = readFileSync(new URL("./processStripeBillingWebhook.ts", import.meta.url), "utf8");
  const confirm = readFileSync(new URL("./confirmServiceRequestConnection.ts", import.meta.url), "utf8");
  assert.equal(source.includes(".capture("), false);
  assert.equal(source.includes('status: "failed"'), false);
  assert.match(source, /fulfillConfirmedServiceRequestCapture/);
  assert.match(source, /client_confirmed_at/);
  assert.equal(confirm.includes("finalizeServiceRequestConnection"), false);
  assert.equal(confirm.includes('from("request_offer_access_grants").insert'), false);
  assert.match(confirm, /request_offer_access_grants/);
  assert.match(aggregate, /processStripeWebhookEventForServiceRequestAuthorization/);
  assert.match(aggregate, /processStripeWebhookEventForRequestOffers/);
  assert.match(aggregate, /serviceRequestAuthorization\.outcome === "retryable_failure"/);
});
