import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Environment } from "@apple/app-store-server-library";

import { bundledAppleRootCertificates } from "./appleRootCertificates.ts";
import {
  createAppleSignedTransactionVerifier,
  interpretAppleTransaction,
  readAppleStoreVerificationConfig,
} from "./appleStoreTransaction.ts";
import { buildMatchedServiceRequestOfferIdempotencyKey } from "../leadEngine/requestOfferPolicy.ts";
import { storeVerifyHttp, verifyAppleStorePurchase } from "./verifyAppleStorePurchase.ts";

const CLIENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SPEC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SPEC_USER = "88888888-8888-4888-8888-888888888888";
const OTHER = "99999999-9999-4999-8999-999999999999";
const REQUEST = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MATCH = "11111111-1111-4111-8111-111111111111";
const OFFER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CLAIM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OTHER_CLAIM = "dddddddd-dddd-4ddd-8ddd-ddddddddddd1";
const ON = {
  SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true",
  SERVICE_REQUEST_STORE_PAYMENT_ENABLED: "true",
};
const JWS = "header.payload.signature";

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
      like() { return api; },
      limit() { return api; },
      order() { return api; },
      update(next: Row) { patch = next; return api; },
      insert(row: Row | Row[]) {
        const one = Array.isArray(row) ? row[0] : row;
        incoming = { ...one, id: one.id ?? crypto.randomUUID() };
        return api;
      },
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

function seed(patch: Partial<Record<string, Row[]>> = {}) {
  const base: Record<string, Row[]> = {
    service_request_claims: [{
      id: CLAIM,
      status: "reserved",
      specialist_id: SPEC,
      service_request_id: REQUEST,
      match_id: MATCH,
      request_offer_id: OFFER,
      client_confirmed_at: "2026-10-03T10:00:00.000Z",
      client_rejected_at: null,
      payment_rail: "store",
    }],
    service_requests: [{
      id: REQUEST,
      status: "open",
      public_id: "REQ-STORE",
      client_user_id: CLIENT,
      client_email: null,
      requested_service: "коуч",
      category_text: null,
      selected_specialist_id: null,
    }],
    request_offers: [{
      id: OFFER,
      status: "open",
      request_kind: "service_request",
      offer_reason: "matched",
      service_request_id: REQUEST,
      specialist_id: SPEC,
      billing_model: "pay_per_lead",
      price_cents: 2500,
      currency: "eur",
      idempotency_key: buildMatchedServiceRequestOfferIdempotencyKey({ requestId: REQUEST, specialistId: SPEC }),
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
    conversation_messages: [],
    inbox_items: [],
    notification_outbox: [],
  };
  return new Memory({ ...base, ...patch });
}

function verified(transactionId = "apple-tx-1") {
  return {
    verify: async () => ({
      ok: true as const,
      transaction: {
        transactionId,
        productId: "freuly.request_access.eur.2500",
        bundleId: "de.freuly.app",
        environment: "sandbox" as const,
        appAccountToken: SPEC_USER,
      },
    }),
  };
}

function client(db: Memory) {
  return db as unknown as SupabaseClient;
}

async function verify(db: Memory, extra: Record<string, unknown> = {}) {
  return verifyAppleStorePurchase({
    supabase: client(db),
    claimId: CLAIM,
    specialistId: SPEC,
    userId: SPEC_USER,
    signedTransaction: JWS,
    env: ON,
    verifier: verified(),
    ...extra,
  });
}

test("unauthenticated verify is refused before a purchase is read", async () => {
  const db = seed();
  let called = false;
  const result = await storeVerifyHttp({
    session: { kind: "unauthorized" },
    claimId: CLAIM,
    body: { signedTransaction: JWS },
    supabase: client(db),
    env: ON,
    verifier: { verify: async () => { called = true; return { ok: false, error: "invalid" }; } },
  });
  assert.equal(result.status, 401);
  assert.equal(result.body.error, "unauthorized");
  assert.equal(called, false);
  assert.equal(db.tables.request_offer_payments.length, 0);
});

test("wrong specialist is refused", async () => {
  const result = await verify(seed(), { specialistId: OTHER });
  assert.deepEqual(result, { ok: false, error: "forbidden" });
});

test("claim must be reserved", async () => {
  const db = seed();
  db.tables.service_request_claims[0].status = "released";
  assert.equal((await verify(db)).ok, false);
  assert.equal((await verify(db) as { error?: string }).error, "not_claimable");
});

test("payment rail must be store", async () => {
  const db = seed();
  db.tables.service_request_claims[0].payment_rail = "stripe";
  const result = await verify(db);
  assert.deepEqual(result, { ok: false, error: "not_claimable" });
  assert.equal(db.tables.request_offer_payments.length, 0);
});

test("client confirmation is required", async () => {
  const db = seed();
  db.tables.service_request_claims[0].client_confirmed_at = null;
  assert.deepEqual(await verify(db), { ok: false, error: "not_claimable" });
  db.tables.service_request_claims[0].client_confirmed_at = "2026-10-03T10:00:00.000Z";
  db.tables.service_request_claims[0].client_rejected_at = "2026-10-03T11:00:00.000Z";
  assert.deepEqual(await verify(db), { ok: false, error: "not_claimable" });
});

test("canonical matched offer is required", async () => {
  const db = seed();
  db.tables.request_offers[0].offer_reason = "direct";
  assert.deepEqual(await verify(db), { ok: false, error: "invariant" });
});

test("amount must be exactly 2500 and currency eur", async () => {
  const priced = seed();
  priced.tables.request_offers[0].price_cents = 7000;
  assert.deepEqual(await verify(priced), { ok: false, error: "invariant" });
  const currency = seed();
  currency.tables.request_offers[0].currency = "usd";
  assert.deepEqual(await verify(currency), { ok: false, error: "invariant" });
});

test("wrong Apple product, bundle, environment, signature, and revocation are refused", async () => {
  const cases = ["wrong_product", "wrong_bundle", "wrong_environment", "invalid", "revoked"] as const;
  for (const error of cases) {
    const db = seed();
    const result = await verify(db, { verifier: { verify: async () => ({ ok: false as const, error }) } });
    assert.deepEqual(result, { ok: false, error });
    assert.equal(db.tables.request_offer_payments.length, 0);
    assert.equal(db.tables.conversations.length, 0);
    const http = await storeVerifyHttp({
      session: { kind: "ok", userId: SPEC_USER, specialistId: SPEC, specialistStatus: "active" },
      claimId: CLAIM,
      body: { signedTransaction: JWS },
      supabase: client(db),
      env: ON,
      verifier: { verify: async () => ({ ok: false as const, error }) },
    });
    assert.equal(http.status, 422);
    assert.equal(http.body.error, "invalid");
  }
});

test("interpreted Apple payload rejects a different product, bundle, environment, and revocation", () => {
  const expected = { bundleId: "de.freuly.app", environment: Environment.SANDBOX };
  const base = {
    transactionId: "tx",
    productId: "freuly.request_access.eur.2500",
    bundleId: "de.freuly.app",
    environment: "Sandbox",
    revocationDate: null,
  };
  assert.equal(interpretAppleTransaction({ ...base, productId: "other" }, expected).ok, false);
  assert.equal(interpretAppleTransaction({ ...base, bundleId: "other.app" }, expected).ok, false);
  assert.equal(interpretAppleTransaction({ ...base, environment: "Production" }, expected).ok, false);
  assert.equal(interpretAppleTransaction({ ...base, revocationDate: 1 }, expected).ok, false);
  assert.equal(interpretAppleTransaction(base, expected).ok, true);
});

test("transaction id is stored once and the same claim is idempotent", async () => {
  const db = seed();
  const first = await verify(db);
  const second = await verify(db);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (first.ok && first.state === "connected" && second.ok && second.state === "connected") {
    assert.equal(first.conversationId, second.conversationId);
  }
  assert.equal(db.tables.request_offer_payments.length, 1);
  assert.equal(db.tables.request_offer_payments[0].provider_transaction_id, "apple-tx-1");
  assert.equal(db.tables.request_offer_access_grants.length, 1);
  assert.equal(db.tables.request_offers[0].status, "paid");
  assert.equal(db.tables.service_request_claims[0].status, "completed");
  assert.equal(db.tables.conversations.length, 1);
});

test("the same Apple transaction cannot settle a different claim", async () => {
  const db = seed({
    request_offer_payments: [{
      id: "pay-other",
      offer_id: "offer-other",
      specialist_id: OTHER,
      service_request_claim_id: OTHER_CLAIM,
      status: "paid",
      provider: "apple",
      provider_transaction_id: "apple-tx-1",
      provider_environment: "sandbox",
    }],
  });
  const result = await verify(db);
  assert.deepEqual(result, { ok: false, error: "invariant" });
  assert.equal(db.tables.request_offer_payments.length, 1);
  assert.equal(db.tables.conversations.length, 0);
  assert.equal(db.tables.service_request_claims[0].status, "reserved");
});

test("no conversation exists before verified settlement", async () => {
  const db = seed();
  const result = await verify(db, {
    verifier: {
      verify: async () => {
        assert.equal(db.tables.conversations.length, 0);
        assert.equal(db.tables.request_offer_payments.length, 0);
        return { ok: false as const, error: "invalid" as const };
      },
    },
  });
  assert.deepEqual(result, { ok: false, error: "invalid" });
  assert.equal(db.tables.conversations.length, 0);
});

test("store verification does not write Stripe ids and leaves the Stripe capture writer untouched", async () => {
  const db = seed();
  const result = await verify(db);
  assert.equal(result.ok, true);
  const payment = db.tables.request_offer_payments[0];
  assert.equal(payment.provider, "apple");
  assert.equal(payment.stripe_payment_intent_id ?? null, null);
  assert.equal("stripe_checkout_session_id" in payment && payment.stripe_checkout_session_id != null, false);
  const stripe = readFileSync(new URL("./fulfillServiceRequestCapture.ts", import.meta.url), "utf8");
  const store = readFileSync(new URL("./verifyAppleStorePurchase.ts", import.meta.url), "utf8");
  assert.match(stripe, /stripe_payment_intent_id/);
  assert.doesNotMatch(store, /stripe_payment_intent_id:/);
  assert.match(readFileSync(new URL("../../app/api/specialist/claims/[claimId]/store/verify/route.ts", import.meta.url), "utf8"), /resolveSpecialistLeadSession/);
});

test("failure after a verified payment can resume without another purchase", async () => {
  const db = seed();
  let attempts = 0;
  const failing = await verify(db, {
    finalizeConnection: async () => {
      attempts += 1;
      throw new Error("finalizer down");
    },
  });
  assert.deepEqual(failing, { ok: true, state: "settling" });
  assert.equal(db.tables.request_offer_payments.length, 1);
  assert.equal(db.tables.conversations.length, 0);
  const resumed = await verify(db);
  assert.equal(resumed.ok, true);
  if (resumed.ok) assert.equal(resumed.state, "connected");
  assert.equal(db.tables.request_offer_payments.length, 1);
  assert.equal(attempts, 1);
  assert.equal(db.tables.conversations.length, 1);
});

test("android evidence and extra commercial fields are rejected", async () => {
  const db = seed();
  const session = { kind: "ok" as const, userId: SPEC_USER, specialistId: SPEC, specialistStatus: "active" };
  const android = await storeVerifyHttp({
    session,
    claimId: CLAIM,
    body: { signedTransaction: JWS, platform: "android" },
    supabase: client(db),
    env: ON,
    verifier: verified(),
  });
  assert.equal(android.status, 409);
  assert.equal(android.body.error, "unsupported");
  const amount = await storeVerifyHttp({
    session,
    claimId: CLAIM,
    body: { signedTransaction: JWS, amount_cents: 1 },
    supabase: client(db),
    env: ON,
    verifier: verified(),
  });
  assert.equal(amount.status, 422);
  assert.equal(db.tables.request_offer_payments.length, 0);
});

test("verified appAccountToken must belong to the authenticated user", async () => {
  const matching = await verify(seed());
  assert.equal(matching.ok, true);

  const missing = seed();
  const missingResult = await verify(missing, {
    verifier: {
      verify: async () => ({
        ok: true as const,
        transaction: {
          transactionId: "apple-tx-1",
          productId: "freuly.request_access.eur.2500",
          bundleId: "de.freuly.app",
          environment: "sandbox" as const,
          appAccountToken: null,
        },
      }),
    },
  });
  assert.deepEqual(missingResult, { ok: false, error: "invalid" });
  assert.equal(missing.tables.request_offer_payments.length, 0);
  assert.equal(missing.tables.request_offer_access_grants.length, 0);
  assert.equal(missing.tables.conversations.length, 0);

  const other = seed();
  const otherResult = await verify(other, {
    verifier: {
      verify: async () => ({
        ok: true as const,
        transaction: {
          transactionId: "apple-tx-1",
          productId: "freuly.request_access.eur.2500",
          bundleId: "de.freuly.app",
          environment: "sandbox" as const,
          appAccountToken: OTHER,
        },
      }),
    },
  });
  assert.deepEqual(otherResult, { ok: false, error: "invalid" });
  assert.equal(other.tables.request_offer_payments.length, 0);
  assert.equal(other.tables.request_offer_access_grants.length, 0);
  assert.equal(other.tables.conversations.length, 0);
  assert.equal(other.tables.service_request_claims[0].status, "reserved");
  assert.equal(other.tables.request_offers[0].status, "open");
});

test("bundled Apple roots are the default and an explicit path override fails closed", () => {
  assert.equal(readAppleStoreVerificationConfig({}).ok, false);
  assert.equal(readAppleStoreVerificationConfig({ APPLE_STORE_ENVIRONMENT: "Production" }).ok, false);

  const sandbox = readAppleStoreVerificationConfig({ APPLE_STORE_ENVIRONMENT: "Sandbox" });
  assert.equal(sandbox.ok, true);
  if (!sandbox.ok) return;
  const bundled = bundledAppleRootCertificates();
  assert.equal(sandbox.config.rootCertificates.length, bundled.length);
  sandbox.config.rootCertificates.forEach((certificate, index) => {
    assert.equal(certificate.equals(bundled[index]), true);
  });
  createAppleSignedTransactionVerifier(sandbox.config);

  const production = readAppleStoreVerificationConfig({
    APPLE_STORE_ENVIRONMENT: "Production",
    APPLE_APP_APPLE_ID: "123456789",
  });
  assert.equal(production.ok, true);
  if (production.ok) createAppleSignedTransactionVerifier(production.config);

  assert.equal(
    readAppleStoreVerificationConfig({
      APPLE_STORE_ENVIRONMENT: "Sandbox",
      APPLE_ROOT_CERTIFICATE_PATHS: "/tmp/freuly-missing-apple-root.cer",
    }).ok,
    false,
  );
});
