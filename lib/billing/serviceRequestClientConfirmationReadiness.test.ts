import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getClientRequestHistoryDetail, listClientRequestHistory } from "../clientRequests/historyService.ts";
import { buildMatchedServiceRequestOfferIdempotencyKey } from "../leadEngine/requestOfferPolicy.ts";
import { PAID_REQUEST_ACCESS_CAPABILITY, PAID_REQUEST_STORE_PURCHASE_CAPABILITY } from "../nativeInstallations/capabilities.ts";
import {
  isServiceRequestClientConfirmationRequired,
  isServiceRequestStorePaymentRequired,
} from "./serviceRequestClientConfirmationReadiness.ts";

const CLIENT = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SPEC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SPEC_USER = "88888888-8888-4888-8888-888888888888";
const REQUEST = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MATCH = "11111111-1111-4111-8111-111111111111";
const OFFER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CLAIM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const STRIPE_ON = {
  SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true",
  SERVICE_REQUEST_PAYMENT_AUTH_ENABLED: "true",
  SERVICE_REQUEST_CAPTURE_ENABLED: "true",
};
const STORE_ON = {
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
      order() { return api; },
      limit() { return api; },
      or() { return api; },
      maybeSingle: async () => ({ data: matched()[0] ? { ...matched()[0] } : null, error: null }),
      then(resolve: (value: { data: Row[]; error: null }) => unknown) {
        return Promise.resolve({ data: matched().map((row) => ({ ...row })), error: null as null }).then(resolve);
      },
    };
    return api;
  }
}

function seed(overrides: {
  claim?: Row | null;
  rail?: string | null;
  confirmed?: string | null;
  payment?: Row | null;
  grant?: boolean;
  capability?: string[];
  active?: boolean;
  selected?: string | null;
} = {}) {
  const claim = overrides.claim === null ? null : {
    id: CLAIM,
    status: "reserved",
    specialist_id: SPEC,
    service_request_id: REQUEST,
    match_id: MATCH,
    request_offer_id: OFFER,
    client_confirmed_at: overrides.confirmed ?? null,
    payment_rail: overrides.rail ?? null,
    ...(overrides.claim ?? {}),
  };
  return new Memory({
    service_requests: [{
      id: REQUEST,
      public_id: "REQ-DETAIL",
      created_at: "2026-09-30T10:00:00.000Z",
      status: "searching",
      category_text: "коуч",
      description: "Нужен коуч",
      preferred_language: "ru",
      work_format: "online",
      city: "Berlin",
      postal_code: "10115",
      client_user_id: CLIENT,
      selected_specialist_id: overrides.selected ?? null,
    }],
    service_request_claims: claim ? [claim] : [],
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
    request_offer_payments: overrides.payment ? [overrides.payment] : [],
    request_offer_access_grants: overrides.grant ? [{
      id: "grant-1",
      offer_id: OFFER,
      specialist_id: SPEC,
      revoked_at: null,
    }] : [],
    specialists: [{ id: SPEC, user_id: SPEC_USER }],
    native_installations: [{
      user_id: SPEC_USER,
      active: overrides.active ?? true,
      capabilities: overrides.capability ?? [PAID_REQUEST_STORE_PURCHASE_CAPABILITY],
    }],
    leads: [],
  });
}

const authorized = {
  id: "pay-1",
  offer_id: OFFER,
  specialist_id: SPEC,
  service_request_claim_id: CLAIM,
  amount_cents: 2500,
  currency: "eur",
  status: "authorized",
  stripe_payment_intent_id: "pi_auth",
  provider: "stripe",
};

async function required(db: Memory, env: NodeJS.ProcessEnv = {}, stripeConfigured = false) {
  return isServiceRequestClientConfirmationRequired({
    supabase: db as unknown as SupabaseClient,
    requestId: REQUEST,
    env,
    stripeConfigured,
  });
}

test("client detail confirmation is true only for a confirmable bound rail", async () => {
  assert.equal(await required(seed({ claim: null })), false);
  assert.equal(await required(seed({ rail: null }), STORE_ON, true), false);
  assert.equal(
    await required(
      seed({
        rail: "stripe",
        payment: authorized,
        claim: { confirmation_expires_at: "2099-01-01T00:00:00.000Z" },
      }),
      STRIPE_ON,
      true,
    ),
    true,
  );
  assert.equal(await required(seed({ rail: "stripe", payment: authorized }), STRIPE_ON, true), false);
  assert.equal(
    await required(
      seed({
        rail: "stripe",
        payment: authorized,
        claim: { confirmation_expires_at: "2000-01-01T00:00:00.000Z" },
      }),
      STRIPE_ON,
      true,
    ),
    false,
  );
  assert.equal(await required(seed({ rail: "stripe", payment: authorized }), STRIPE_ON, false), false);
  assert.equal(await required(seed({ rail: "store" }), STORE_ON), true);
  assert.equal(await required(seed({ rail: "store" }), { SERVICE_REQUEST_PAID_CLAIM_ENABLED: "true" }), false);
  assert.equal(await required(seed({ rail: "store", capability: [PAID_REQUEST_ACCESS_CAPABILITY] }), STORE_ON), false);
  assert.equal(await required(seed({ rail: "store", confirmed: "2026-09-30T12:00:00.000Z" }), STORE_ON), false);
  assert.equal(await required(seed({ rail: "store", grant: true }), STORE_ON), false);
  assert.equal(await required(seed({ claim: { status: "released" }, rail: "store" }), STORE_ON), false);
  assert.equal(await required(seed({ rail: "stripe", payment: authorized, grant: true }), STRIPE_ON, true), false);
});

test("owned request detail exposes the absolute confirmation deadline", async () => {
  const previousStore = process.env.SERVICE_REQUEST_STORE_PAYMENT_ENABLED;
  const previousPaid = process.env.SERVICE_REQUEST_PAID_CLAIM_ENABLED;
  process.env.SERVICE_REQUEST_STORE_PAYMENT_ENABLED = "true";
  process.env.SERVICE_REQUEST_PAID_CLAIM_ENABLED = "true";
  try {
    const deadline = "2099-01-01T00:00:00.000Z";
    const db = seed({
      rail: "store",
      claim: { confirmation_expires_at: deadline },
    });
    const detail = await getClientRequestHistoryDetail(
      db as unknown as SupabaseClient,
      CLIENT,
      "service_request",
      "REQ-DETAIL",
    );
    assert.equal(detail?.connection_confirmation_required, true);
    assert.equal(detail?.confirmation_expires_at, deadline);
    const encoded = JSON.stringify(detail);
    assert.equal(encoded.includes("pi_auth"), false);
    assert.equal(encoded.includes("client_secret"), false);
    assert.equal(encoded.includes(SPEC), false);
    const history = await listClientRequestHistory(db as unknown as SupabaseClient, CLIENT, {});
    assert.equal(history.items.some((item) => "confirmation_expires_at" in item), false);
  } finally {
    if (previousStore === undefined) delete process.env.SERVICE_REQUEST_STORE_PAYMENT_ENABLED;
    else process.env.SERVICE_REQUEST_STORE_PAYMENT_ENABLED = previousStore;
    if (previousPaid === undefined) delete process.env.SERVICE_REQUEST_PAID_CLAIM_ENABLED;
    else process.env.SERVICE_REQUEST_PAID_CLAIM_ENABLED = previousPaid;
  }
});

test("service-request detail exposes the boolean and history does not", async () => {
  const previousStore = process.env.SERVICE_REQUEST_STORE_PAYMENT_ENABLED;
  const previousPaid = process.env.SERVICE_REQUEST_PAID_CLAIM_ENABLED;
  process.env.SERVICE_REQUEST_STORE_PAYMENT_ENABLED = "true";
  process.env.SERVICE_REQUEST_PAID_CLAIM_ENABLED = "true";
  try {
  const ready = seed({ rail: "store" });
  const detail = await getClientRequestHistoryDetail(ready as unknown as SupabaseClient, CLIENT, "service_request", "REQ-DETAIL");
  assert.equal(detail?.connection_confirmation_required, true);
  assert.equal(JSON.stringify(detail).includes("pi_auth"), false);
  assert.equal(JSON.stringify(detail).includes(SPEC), false);

  const closed = seed({ rail: null });
  const hidden = await getClientRequestHistoryDetail(closed as unknown as SupabaseClient, CLIENT, "service_request", "REQ-DETAIL");
  assert.equal(hidden?.connection_confirmation_required, false);

  const history = await listClientRequestHistory(ready as unknown as SupabaseClient, CLIENT, {});
  assert.equal(history.items.some((item) => "connection_confirmation_required" in item), false);
  assert.equal(detail?.connection_payment_required, false);
  } finally {
    if (previousStore === undefined) delete process.env.SERVICE_REQUEST_STORE_PAYMENT_ENABLED;
    else process.env.SERVICE_REQUEST_STORE_PAYMENT_ENABLED = previousStore;
    if (previousPaid === undefined) delete process.env.SERVICE_REQUEST_PAID_CLAIM_ENABLED;
    else process.env.SERVICE_REQUEST_PAID_CLAIM_ENABLED = previousPaid;
  }
});

test("store payment is required only after client confirmation and before settlement", async () => {
  const waiting = seed({ rail: "store" });
  assert.equal(await isServiceRequestStorePaymentRequired({
    supabase: waiting as unknown as SupabaseClient,
    requestId: REQUEST,
  }), false);
  const confirmed = seed({ rail: "store", confirmed: "2026-09-30T12:00:00.000Z" });
  assert.equal(await isServiceRequestStorePaymentRequired({
    supabase: confirmed as unknown as SupabaseClient,
    requestId: REQUEST,
  }), true);
  const settled = seed({ rail: "store", confirmed: "2026-09-30T12:00:00.000Z", grant: true });
  assert.equal(await isServiceRequestStorePaymentRequired({
    supabase: settled as unknown as SupabaseClient,
    requestId: REQUEST,
  }), false);
  const detail = await getClientRequestHistoryDetail(
    confirmed as unknown as SupabaseClient,
    CLIENT,
    "service_request",
    "REQ-DETAIL",
  );
  assert.equal(detail?.connection_confirmation_required, false);
  assert.equal(detail?.connection_payment_required, true);
});
