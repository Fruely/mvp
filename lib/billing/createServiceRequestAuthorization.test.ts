import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createServiceRequestAuthorization,
  serviceRequestAuthorizationIdempotencyKey,
  type ServiceRequestAuthorizationStripe,
} from "./createServiceRequestAuthorization.ts";
import { processStripeWebhookEventForServiceRequestAuthorization } from "./processServiceRequestAuthorizationWebhook.ts";

const CLAIM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OFFER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const SPEC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER = "99999999-9999-4999-8999-999999999999";
const REQUEST = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MATCH = "11111111-1111-4111-8111-111111111111";
const SECRET = "pi_test_secret_do_not_store";
const ON = {
  SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true",
  SERVICE_REQUEST_PAYMENT_AUTH_ENABLED: "true",
};

type Row = Record<string, unknown>;

class Memory {
  readonly tables: Record<string, Row[]>;
  readonly updates: Array<{ table: string; patch: Row }> = [];
  readonly inserts: Array<{ table: string; row: Row }> = [];

  constructor(seed: Record<string, Row[]>) {
    this.tables = {};
    for (const [name, rows] of Object.entries(seed)) {
      this.tables[name] = rows.map((row) => ({ ...row }));
    }
  }

  from(table: string) {
    return new Query(this, table);
  }
}

class Query {
  private readonly filters: Array<(row: Row) => boolean> = [];
  private patch: Row | null = null;
  private pending: Row | null = null;

  constructor(
    private readonly db: Memory,
    private readonly table: string,
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  insert(row: Row) {
    this.pending = { ...row, id: crypto.randomUUID() };
    return this;
  }

  update(patch: Row) {
    this.patch = patch;
    return this;
  }

  private matched() {
    return (this.db.tables[this.table] ?? []).filter((row) => this.filters.every((filter) => filter(row)));
  }

  async maybeSingle() {
    return { data: this.matched()[0] ?? null, error: null };
  }

  async single() {
    if (!this.pending) return { data: this.matched()[0] ?? null, error: null };
    const row = this.pending;
    const active = ["pending", "authorized", "paid"];
    const clash = (this.db.tables[this.table] ?? []).some(
      (existing) =>
        row.service_request_claim_id &&
        existing.service_request_claim_id === row.service_request_claim_id &&
        active.includes(String(existing.status)) &&
        active.includes(String(row.status)),
    );
    if (clash) return { data: null, error: { code: "23505" } };
    this.db.tables[this.table] = [...(this.db.tables[this.table] ?? []), row];
    this.db.inserts.push({ table: this.table, row });
    return { data: { ...row }, error: null };
  }

  then(
    resolve: (value: { data: Row[]; error: null }) => unknown,
    reject?: (reason: unknown) => unknown,
  ) {
    const run = async () => {
      if (this.patch) {
        this.db.updates.push({ table: this.table, patch: this.patch });
        for (const row of this.matched()) Object.assign(row, this.patch);
      }
      return { data: this.matched().map((row) => ({ ...row })), error: null as null };
    };
    return run().then(resolve, reject);
  }
}

function seed(price: number | null = 2500, extra: Record<string, Row[]> = {}) {
  return new Memory({
    service_request_claims: [
      {
        id: CLAIM,
        status: "reserved",
        specialist_id: SPEC,
        service_request_id: REQUEST,
        match_id: MATCH,
        request_offer_id: OFFER,
      },
    ],
    request_offers: [
      {
        id: OFFER,
        request_kind: "service_request",
        service_request_id: REQUEST,
        specialist_id: SPEC,
        billing_model: "pay_per_lead",
        status: "offered",
        price_cents: price,
        currency: "eur",
      },
    ],
    service_requests: [{ id: REQUEST, selected_specialist_id: null, client_budget_text: "500 euros" }],
    service_request_matches: [
      { id: MATCH, specialist_id: SPEC, service_request_id: REQUEST, status: "active" },
    ],
    request_offer_payments: [],
    ...extra,
  });
}

function stripeFor(createImpl?: ServiceRequestAuthorizationStripe["paymentIntents"]["create"]) {
  const creates: Array<{ params: Record<string, unknown>; options: { idempotencyKey: string } }> = [];
  const retrieves: string[] = [];
  const stripe: ServiceRequestAuthorizationStripe = {
    paymentIntents: {
      create: createImpl ?? (async (params, options) => {
        creates.push({ params, options });
        return {
          id: "pi_created",
          amount: Number(params.amount),
          currency: String(params.currency),
          status: "requires_payment_method",
          client_secret: SECRET,
        };
      }),
      retrieve: async (id) => {
        retrieves.push(id);
        return {
          id,
          amount: 2500,
          currency: "eur",
          status: "requires_capture",
          client_secret: SECRET,
        };
      },
    },
  };
  return { stripe, creates, retrieves };
}

function persisted(db: Memory) {
  return JSON.stringify({ inserts: db.inserts, updates: db.updates, tables: db.tables });
}

async function authorize(
  db: Memory,
  stripe: ServiceRequestAuthorizationStripe,
  env: NodeJS.ProcessEnv = ON,
  extra: Record<string, unknown> = {},
) {
  return createServiceRequestAuthorization({
    supabase: db as unknown as SupabaseClient,
    claimId: CLAIM,
    specialistId: SPEC,
    userId: USER,
    env,
    stripe,
    resolveCustomer: async () => "cus_test",
    ...extra,
  });
}

test("payment authorization is closed unless both flags are on", async () => {
  const db = seed();
  const { stripe, creates } = stripeFor();
  const result = await authorize(db, stripe, {});
  assert.deepEqual(result, { ok: false, error: "not_found" });
  assert.equal(creates.length, 0);
  assert.equal(db.inserts.length, 0);
});

test("null price returns price_unavailable and does not call Stripe", async () => {
  const db = seed(null);
  const { stripe, creates } = stripeFor();
  const result = await authorize(db, stripe);
  assert.deepEqual(result, { ok: false, error: "price_unavailable" });
  assert.equal(creates.length, 0);
  assert.equal(db.inserts.length, 0);
  assert.equal(db.updates.length, 0);
  assert.equal(JSON.stringify(db.inserts).includes("500 euros"), false);
  assert.equal(db.tables.request_offers[0]?.price_cents, null);
});

test("amount and currency come from the offer and the body cannot choose them", async () => {
  const db = seed(2500);
  const { stripe, creates } = stripeFor();
  const result = await authorize(db, stripe, ON, {
    amount: 1,
    currency: "usd",
    offerId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    price: 1,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.amountCents, 2500);
  assert.equal(result.currency, "eur");
  assert.equal(creates[0]?.params.amount, 2500);
  assert.equal(creates[0]?.params.currency, "eur");
  assert.equal(creates[0]?.params.capture_method, "manual");
  assert.equal(creates[0]?.params.confirmation_method, "automatic");
  assert.deepEqual(creates[0]?.params.payment_method_types, ["card"]);
  assert.equal(db.inserts[0]?.row.amount_cents, 2500);
  assert.equal(db.inserts[0]?.row.currency, "eur");
  assert.equal(creates[0]?.params.metadata && (creates[0].params.metadata as Row).offer_id, OFFER);
});

test("retry reuses the pending payment and a stable Stripe idempotency key", async () => {
  const db = seed();
  let attempts = 0;
  const { stripe, creates } = stripeFor(async (params, options) => {
    attempts += 1;
    creates.push({ params, options });
    if (attempts === 1) throw new Error("socket hang up");
    return {
      id: "pi_created",
      amount: Number(params.amount),
      currency: String(params.currency),
      status: "requires_payment_method",
      client_secret: SECRET,
    };
  });
  const first = await authorize(db, stripe);
  assert.deepEqual(first, { ok: false, error: "retryable" });
  assert.equal(db.inserts.length, 1);
  assert.equal(db.tables.request_offer_payments[0]?.status, "pending");
  const second = await authorize(db, stripe);
  assert.equal(second.ok, true);
  if (!second.ok || second.state !== "requires_confirmation") return;
  assert.equal(second.clientSecret, SECRET);
  assert.equal(db.inserts.length, 1);
  assert.equal(creates.length, 2);
  const paymentId = String(db.inserts[0]?.row.id);
  assert.equal(creates[0]?.options.idempotencyKey, serviceRequestAuthorizationIdempotencyKey(paymentId));
  assert.equal(creates[1]?.options.idempotencyKey, creates[0]?.options.idempotencyKey);
  assert.equal(persisted(db).includes(SECRET), false);

  const third = await authorize(db, stripe);
  assert.equal(third.ok, true);
  if (!third.ok) return;
  assert.equal(third.state, "authorized");
  assert.equal("clientSecret" in third, false);
  assert.equal(creates.length, 2);
  assert.equal(db.tables.service_request_claims[0]?.status, "reserved");
});

test("an authorized or paid payment does not create another PaymentIntent", async () => {
  for (const status of ["authorized", "paid"] as const) {
    const db = seed();
    db.tables.request_offer_payments = [
      {
        id: "12121212-1212-4121-8121-121212121212",
        offer_id: OFFER,
        specialist_id: SPEC,
        service_request_claim_id: CLAIM,
        user_id: USER,
        amount_cents: 2500,
        currency: "eur",
        status,
        stripe_payment_intent_id: "pi_existing",
        authorized_at: "2026-09-29T12:00:00.000Z",
        paid_at: status === "paid" ? "2026-09-29T12:00:00.000Z" : null,
      },
    ];
    const { stripe, creates, retrieves } = stripeFor();
    const result = await authorize(db, stripe);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.state, status);
    assert.equal("clientSecret" in result, false);
    assert.equal(creates.length, 0);
    assert.equal(retrieves.length, 0);
    assert.equal(db.inserts.length, 0);
  }
});

test("a pending payment is reused and a conflicting insert converges on it", async () => {
  const db = seed();
  const existing = {
    id: "12121212-1212-4121-8121-121212121212",
    offer_id: OFFER,
    specialist_id: SPEC,
    service_request_claim_id: CLAIM,
    user_id: USER,
    amount_cents: 2500,
    currency: "eur",
    status: "pending",
    stripe_payment_intent_id: null,
  };
  db.tables.request_offer_payments = [{ ...existing }];
  let hidden = true;
  const original = db.from.bind(db);
  db.from = (table: string) => {
    const query = original(table);
    if (table !== "request_offer_payments") return query;
    const maybeSingle = query.maybeSingle.bind(query);
    query.maybeSingle = async () => {
      if (hidden) {
        hidden = false;
        return { data: null, error: null };
      }
      return maybeSingle();
    };
    return query;
  };
  const { stripe, creates } = stripeFor();
  const result = await authorize(db, stripe);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.paymentId, existing.id);
  assert.equal(db.inserts.length, 0);
  assert.equal(creates.length, 1);
  assert.equal(creates[0]?.options.idempotencyKey, serviceRequestAuthorizationIdempotencyKey(existing.id));
  assert.equal(db.tables.request_offer_payments.length, 1);
});

test("payment_failed keeps one pending PaymentIntent and the next call reuses it", async () => {
  const db = seed();
  const { stripe, creates } = stripeFor(async (params, options) => {
    creates.push({ params, options });
    return {
      id: "pi_created",
      amount: Number(params.amount),
      currency: String(params.currency),
      status: "requires_payment_method",
      client_secret: SECRET,
    };
  });
  stripe.paymentIntents.retrieve = async (id) => ({
    id,
    amount: 2500,
    currency: "eur",
    status: "requires_payment_method",
    client_secret: SECRET,
  });
  const created = await authorize(db, stripe);
  assert.equal(created.ok, true);
  const paymentId = String(db.tables.request_offer_payments[0]?.id);
  const failed = await processStripeWebhookEventForServiceRequestAuthorization(
    db as unknown as SupabaseClient,
    {
      id: "evt_failed",
      type: "payment_intent.payment_failed",
      data: {
        object: {
          id: "pi_created",
          object: "payment_intent",
          amount: 2500,
          currency: "eur",
          status: "requires_payment_method",
          metadata: {
            purpose: "service_request_access_authorization",
            payment_id: paymentId,
            offer_id: OFFER,
            claim_id: CLAIM,
            specialist_id: SPEC,
          },
        },
      },
    } as never,
  );
  assert.deepEqual(failed, { outcome: "success" });
  assert.equal(db.tables.request_offer_payments.length, 1);
  assert.equal(db.tables.request_offer_payments[0]?.status, "pending");
  assert.equal(db.tables.request_offer_payments[0]?.stripe_payment_intent_id, "pi_created");
  assert.equal(db.tables.request_offer_payments[0]?.failed_at, undefined);
  assert.equal(db.tables.service_request_claims[0]?.status, "reserved");

  const retry = await authorize(db, stripe);
  assert.equal(retry.ok, true);
  if (!retry.ok || retry.state !== "requires_confirmation") return;
  assert.equal(retry.paymentId, paymentId);
  assert.equal(retry.clientSecret, SECRET);
  assert.equal(creates.length, 1);
  assert.equal(db.inserts.length, 1);
  assert.equal(db.tables.request_offer_payments.length, 1);
  assert.equal(persisted(db).includes(SECRET), false);
});

test("client secret is returned for confirmation and never persisted", async () => {
  const db = seed();
  const { stripe } = stripeFor();
  const result = await authorize(db, stripe);
  assert.equal(result.ok, true);
  if (!result.ok || result.state !== "requires_confirmation") return;
  assert.equal(result.clientSecret, SECRET);
  assert.equal(persisted(db).includes(SECRET), false);
  assert.equal(persisted(db).includes("client_secret"), false);
  assert.equal(db.tables.service_request_claims[0]?.status, "reserved");
});

test("authorization route and service do not capture, grant, or open chat", () => {
  const service = readFileSync(new URL("./createServiceRequestAuthorization.ts", import.meta.url), "utf8");
  const route = readFileSync(
    new URL("../../app/api/specialist/claims/[claimId]/payment-intent/route.ts", import.meta.url),
    "utf8",
  );
  const checkout = readFileSync(new URL("./createRequestOfferCheckout.ts", import.meta.url), "utf8");
  const claimRoute = readFileSync(
    new URL("../../app/api/specialist/matches/[matchId]/claim/route.ts", import.meta.url),
    "utf8",
  );
  assert.equal(service.includes("paymentIntents.capture"), false);
  assert.equal(service.includes("request_offer_access_grants"), false);
  assert.equal(service.includes("conversations"), false);
  assert.equal(service.includes("client_budget_text"), false);
  assert.equal(service.includes("capture_method: \"manual\""), true);
  assert.equal(route.includes("request.json"), false);
  assert.equal(route.includes("session.specialistId"), true);
  assert.equal(route.includes("console.log"), false);
  assert.equal(/console[\s\S]{0,120}clientSecret/.test(route), false);
  assert.match(checkout, /checkout\.sessions\.create/);
  assert.equal(checkout.includes("service_request_access_authorization"), false);
  assert.equal(checkout.includes("capture_method: \"manual\""), false);
  assert.match(claimRoute, /conversationId: result\.conversationId/);
  assert.equal(claimRoute.includes("createServiceRequestAuthorization"), false);
  assert.equal(claimRoute.includes("request_offer_payments"), false);
});
