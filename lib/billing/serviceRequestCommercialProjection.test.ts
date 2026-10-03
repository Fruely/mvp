import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildMatchedServiceRequestOfferIdempotencyKey } from "../leadEngine/requestOfferPolicy.ts";
import { loadOwnedMatchPreview, readOwnedMatchPreview } from "../inbox/matchPreview.ts";
import {
  deriveCommercialConnection,
  type CommercialClaimFact,
  type CommercialPaymentFact,
} from "./serviceRequestCommercialProjection.ts";
import type { PaymentRequiredOffer } from "./serviceRequestPaidAccessState.ts";

const SPEC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const REQUEST = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const MATCH = "11111111-1111-4111-8111-111111111111";
const OTHER_MATCH = "22222222-2222-4222-8222-222222222222";
const OFFER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const OTHER_OFFER = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const CLAIM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const OLD_CLAIM = "abababab-abab-4aba-8aba-abababababab";
const PAYMENT = "12121212-1212-4121-8121-121212121212";
const OLD_PAYMENT = "34343434-3434-4343-8343-343434343434";
const FOREIGN_PAYMENT = "56565656-5656-4565-8565-565656565656";
const DEADLINE = "2099-01-01T00:00:00.000Z";

function offer(specialistId = SPEC, price = 2500, id = OFFER): PaymentRequiredOffer {
  return {
    id,
    requestKind: "service_request",
    offerReason: "matched",
    billingModel: "pay_per_lead",
    serviceRequestId: REQUEST,
    specialistId,
    currency: "eur",
    priceCents: price,
    idempotencyKey: buildMatchedServiceRequestOfferIdempotencyKey({ requestId: REQUEST, specialistId }),
  };
}

function claim(overrides: Partial<CommercialClaimFact> = {}): CommercialClaimFact {
  return {
    id: CLAIM,
    status: "reserved",
    serviceRequestId: REQUEST,
    matchId: MATCH,
    specialistId: SPEC,
    requestOfferId: OFFER,
    clientConfirmedAt: null,
    clientRejectedAt: null,
    confirmationExpiresAt: null,
    paymentRail: "stripe",
    releaseReason: null,
    ...overrides,
  };
}

function payment(overrides: Partial<CommercialPaymentFact> = {}): CommercialPaymentFact {
  return {
    id: PAYMENT,
    claimId: CLAIM,
    offerId: OFFER,
    specialistId: SPEC,
    amountCents: 2500,
    currency: "eur",
    status: "authorized",
    ...overrides,
  };
}

function project(input: {
  claims?: CommercialClaimFact[];
  payments?: CommercialPaymentFact[];
  offers?: PaymentRequiredOffer[];
  selectedSpecialistId?: string | null;
  conversationSpecialistId?: string | null;
} = {}) {
  return deriveCommercialConnection({
    requestId: REQUEST,
    matchId: MATCH,
    specialistId: SPEC,
    selectedSpecialistId: input.selectedSpecialistId ?? null,
    conversationSpecialistId: input.conversationSpecialistId ?? null,
    offers: input.offers ?? [offer()],
    claims: input.claims ?? [],
    payments: input.payments ?? [],
  });
}

test("no claim is request_presented with no commercial ids", () => {
  assert.deepEqual(project(), {
    state: "request_presented",
    claim_id: null,
    payment_id: null,
    amount_cents: null,
    currency: null,
    confirmation_expires_at: null,
  });
});

test("a reserved canonical claim without a payment is payment_required", () => {
  assert.deepEqual(project({ claims: [claim()] }), {
    state: "payment_required",
    claim_id: CLAIM,
    payment_id: null,
    amount_cents: null,
    currency: null,
    confirmation_expires_at: null,
  });
});

test("a pending canonical euro payment is authorizing", () => {
  const result = project({
    claims: [claim()],
    payments: [payment({ status: "pending" })],
  });
  assert.equal(result.state, "authorizing");
  assert.equal(result.claim_id, CLAIM);
  assert.equal(result.payment_id, PAYMENT);
  assert.equal(result.amount_cents, 2500);
  assert.equal(result.currency, "eur");
});

test("an authorized canonical payment exposes the stored deadline exactly", () => {
  const result = project({
    claims: [claim({ confirmationExpiresAt: DEADLINE })],
    payments: [payment({ status: "authorized" })],
  });
  assert.equal(result.state, "authorized");
  assert.equal(result.confirmation_expires_at, DEADLINE);
  assert.equal(result.amount_cents, 2500);
  assert.equal(result.payment_id, PAYMENT);
});

test("authorized does not invent a missing deadline", () => {
  const result = project({
    claims: [claim({ confirmationExpiresAt: null })],
    payments: [payment({ status: "authorized" })],
  });
  assert.equal(result.state, "authorized");
  assert.equal(result.confirmation_expires_at, null);
});

test("stored client confirmation before payment is final is client_confirmed and has no conversation", () => {
  const result = project({
    claims: [claim({ clientConfirmedAt: "2026-09-29T18:00:00.000Z", confirmationExpiresAt: DEADLINE })],
    payments: [payment({ status: "authorized" })],
  });
  assert.equal(result.state, "client_confirmed");
  assert.equal(result.claim_id, CLAIM);
  assert.equal(result.payment_id, PAYMENT);
  assert.equal(result.confirmation_expires_at, DEADLINE);
});

test("a paid payment alone is an incoherent saga, not a fresh presentation", () => {
  assert.equal(project({
    claims: [claim()],
    payments: [payment({ status: "paid" })],
  }), null);
});

test("paid but unfinished confirmation is capturing", () => {
  const result = project({
    claims: [claim({ clientConfirmedAt: "2026-09-29T18:00:00.000Z", status: "reserved" })],
    payments: [payment({ status: "paid" })],
    selectedSpecialistId: SPEC,
  });
  assert.equal(result.state, "capturing");
  assert.equal(result.payment_id, PAYMENT);
});

test("connected requires paid payment, selection, a completed claim, and a conversation", () => {
  const ready = project({
    claims: [claim({ status: "completed", clientConfirmedAt: "2026-09-29T18:00:00.000Z" })],
    payments: [payment({ status: "paid" })],
    selectedSpecialistId: SPEC,
    conversationSpecialistId: SPEC,
  });
  assert.equal(ready.state, "connected");
  assert.equal(ready.claim_id, CLAIM);
  assert.equal(ready.payment_id, PAYMENT);

  const missingConversation = project({
    claims: [claim({ status: "completed", clientConfirmedAt: "2026-09-29T18:00:00.000Z" })],
    payments: [payment({ status: "paid" })],
    selectedSpecialistId: SPEC,
  });
  assert.equal(missingConversation.state, "capturing");
});

test("client rejection is declined only for a released client_rejected claim", () => {
  const result = project({
    claims: [claim({ status: "released", releaseReason: "client_rejected", clientRejectedAt: "2026-09-29T19:00:00.000Z" })],
    payments: [payment({ status: "released" })],
  });
  assert.equal(result.state, "declined");
  assert.equal(result.claim_id, CLAIM);
  assert.equal(result.payment_id, PAYMENT);
});

test("confirmation expiry is expired only for an expired confirmation_expired claim", () => {
  const result = project({
    claims: [claim({
      status: "expired",
      releaseReason: "confirmation_expired",
      confirmationExpiresAt: "2020-01-01T00:00:00.000Z",
    })],
    payments: [payment({ status: "released" })],
  });
  assert.equal(result.state, "expired");
  assert.equal(result.claim_id, CLAIM);
  assert.equal(result.confirmation_expires_at, "2020-01-01T00:00:00.000Z");
});

test("a generic released claim is not declined", () => {
  const result = project({
    claims: [claim({ status: "released", releaseReason: "other" })],
  });
  assert.equal(result.state, "request_presented");
  assert.equal(result.claim_id, null);
});

test("a generic expired match claim is not confirmation expiry", () => {
  const result = project({
    claims: [claim({ status: "expired", releaseReason: null, confirmationExpiresAt: "2020-01-01T00:00:00.000Z" })],
  });
  assert.equal(result.state, "request_presented");
  assert.equal(result.claim_id, null);
});

test("a non-canonical amount or currency fails closed", () => {
  for (const bad of [payment({ amountCents: 7000 }), payment({ currency: "usd" })]) {
    assert.equal(project({ claims: [claim()], payments: [bad] }), null);
  }
});

test("another specialist claim and payment are not exposed", () => {
  const result = project({
    claims: [
      claim({ id: OLD_CLAIM, specialistId: OTHER, matchId: OTHER_MATCH, requestOfferId: OTHER_OFFER }),
      claim({ id: CLAIM, specialistId: OTHER, matchId: MATCH, requestOfferId: OTHER_OFFER }),
    ],
    payments: [payment({ id: FOREIGN_PAYMENT, claimId: OLD_CLAIM, offerId: OTHER_OFFER, specialistId: OTHER })],
    offers: [offer(), offer(OTHER, 2500, OTHER_OFFER)],
  });
  assert.equal(result.state, "request_presented");
  assert.equal(result.claim_id, null);
  assert.equal(result.payment_id, null);
  assert.equal(JSON.stringify(result).includes(OLD_CLAIM), false);
  assert.equal(JSON.stringify(result).includes(FOREIGN_PAYMENT), false);
});

test("a historical terminal row does not override the live claim", () => {
  const result = project({
    claims: [
      claim({ id: OLD_CLAIM, status: "released", releaseReason: "client_rejected" }),
      claim({ id: CLAIM, status: "reserved" }),
    ],
    payments: [
      payment({ id: OLD_PAYMENT, claimId: OLD_CLAIM, status: "released" }),
      payment({ id: PAYMENT, claimId: CLAIM, status: "pending" }),
    ],
  });
  assert.equal(result.state, "authorizing");
  assert.equal(result.claim_id, CLAIM);
  assert.equal(result.payment_id, PAYMENT);
});

test("a store claim is not projected as stripe authorization or expiry", () => {
  const reserved = project({
    claims: [claim({ paymentRail: "store", confirmationExpiresAt: "2020-01-01T00:00:00.000Z" })],
    payments: [payment({ status: "authorized" })],
  });
  assert.equal(reserved, null);
  const expired = project({
    claims: [claim({
      paymentRail: "store",
      status: "expired",
      releaseReason: "confirmation_expired",
    })],
  });
  assert.equal(expired?.state, "request_presented");
  assert.equal(expired?.claim_id, null);
});

type Row = Record<string, unknown>;

function memory(seed: Record<string, Row[]>) {
  const tables: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(seed)) tables[name] = rows.map((row) => ({ ...row }));
  const writes: string[] = [];
  function from(table: string) {
    const filters: Array<(row: Row) => boolean> = [];
    let patch: Row | null = null;
    const rows = () => (tables[table] ?? []).filter((row) => filters.every((filter) => filter(row)));
    const apply = async () => {
      if (patch) {
        writes.push(table);
        for (const row of rows()) Object.assign(row, patch);
      }
      return { data: rows().map((row) => ({ ...row })), error: null };
    };
    const api = {
      select() { return api; },
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
      order() { return api; },
      limit() { return api; },
      update(next: Row) { patch = next; return api; },
      insert(row: Row) {
        writes.push(table);
        (tables[table] ??= []).push(row);
        return api;
      },
      maybeSingle: async () => {
        const result = await apply();
        return { data: result.data[0] ?? null, error: null };
      },
      then(resolve: (value: { data: Row[]; error: null }) => void, reject?: (reason: unknown) => void) {
        return apply().then(resolve, reject);
      },
    };
    return api;
  }
  return { supabase: { from } as unknown as SupabaseClient, tables, writes };
}

test("an incoherent live saga is not request_presented and exposes no resume ids", () => {
  const cases = [
    project({ claims: [claim()], payments: [payment({ status: "paid" })] }),
    project({ claims: [claim()], payments: [payment({ amountCents: 7000 })] }),
    project({ claims: [claim()], payments: [payment({ currency: "usd" })] }),
    project({
      claims: [claim()],
      payments: [payment({ id: PAYMENT, status: "pending" }), payment({ id: OLD_PAYMENT, status: "authorized" })],
    }),
    project({
      claims: [claim({ status: "completed" })],
      payments: [payment({ status: "paid" })],
      selectedSpecialistId: SPEC,
    }),
    project({
      claims: [claim()],
      payments: [payment({ offerId: OTHER_OFFER, specialistId: OTHER, status: "pending" })],
    }),
    project({
      claims: [claim({ paymentRail: null })],
      payments: [payment({ status: "pending" })],
    }),
    project({
      claims: [claim({ paymentRail: "apple" })],
      payments: [payment({ status: "authorized" })],
    }),
    project({
      claims: [claim({ id: CLAIM }), claim({ id: OLD_CLAIM, status: "completed" })],
    }),
  ];
  for (const result of cases) {
    assert.equal(result, null);
  }

  const fresh = project();
  assert.equal(fresh?.state, "request_presented");
  const awaitingPayment = project({ claims: [claim({ paymentRail: null })] });
  assert.equal(awaitingPayment?.state, "payment_required");
  assert.equal(awaitingPayment?.claim_id, CLAIM);
});

test("preview read creates no commercial rows and does not call stripe", async () => {
  const db = memory({
    service_request_matches: [{
      id: MATCH,
      specialist_id: SPEC,
      service_request_id: REQUEST,
      status: "active",
      opened_at: null,
      matched_at: "2026-09-27T16:05:00.000Z",
    }],
    service_requests: [{
      id: REQUEST,
      requested_service: "коуч",
      category_text: null,
      description: "опис",
      city: "Berlin",
      postal_code: "10115",
      work_format: "online",
      service_languages: ["uk"],
      client_budget_text: null,
      created_at: "2026-09-27T16:00:00.000Z",
      selected_specialist_id: null,
      client_email: "hidden@example.test",
      client_phone: "+491511234567",
    }],
    request_offers: [{
      id: OFFER,
      service_request_id: REQUEST,
      specialist_id: SPEC,
      request_kind: "service_request",
      offer_reason: "matched",
      billing_model: "pay_per_lead",
      currency: "eur",
      status: "offered",
      price_cents: 2500,
      idempotency_key: buildMatchedServiceRequestOfferIdempotencyKey({ requestId: REQUEST, specialistId: SPEC }),
    }],
    service_request_claims: [{
      id: CLAIM,
      status: "reserved",
      service_request_id: REQUEST,
      match_id: MATCH,
      specialist_id: SPEC,
      request_offer_id: OFFER,
      client_confirmed_at: "2026-09-29T18:00:00.000Z",
      client_rejected_at: null,
      confirmation_expires_at: DEADLINE,
      payment_rail: "stripe",
      release_reason: null,
    }],
    request_offer_payments: [{
      id: PAYMENT,
      service_request_claim_id: CLAIM,
      offer_id: OFFER,
      specialist_id: SPEC,
      amount_cents: 2500,
      currency: "eur",
      status: "authorized",
    }],
    request_offer_access_grants: [],
    conversations: [],
    inbox_items: [],
  });
  const loaded = await loadOwnedMatchPreview(db.supabase, { matchId: MATCH, specialistId: SPEC });
  assert.equal(loaded.status, "ready");
  if (loaded.status !== "ready") return;
  assert.equal(loaded.preview.commercial_connection.state, "client_confirmed");
  assert.equal(loaded.preview.commercial_connection.confirmation_expires_at, DEADLINE);
  assert.equal(loaded.preview.payment_required, false);
  assert.equal(loaded.preview.conversation_id, null);
  assert.equal(JSON.stringify(loaded.preview).includes("hidden@example.test"), false);
  assert.equal(db.writes.length, 0);
  assert.equal(db.tables.request_offer_payments.length, 1);
  assert.equal(db.tables.service_request_claims.length, 1);
  assert.equal(db.tables.conversations.length, 0);

  const opened = await readOwnedMatchPreview(db.supabase, { matchId: MATCH, specialistId: SPEC, userId: SPEC });
  assert.equal(opened.status, "ready");
  assert.deepEqual(db.writes.filter((table) => table !== "service_request_matches" && table !== "inbox_items"), []);
  const source = readFileSync(new URL("./serviceRequestCommercialProjection.ts", import.meta.url), "utf8");
  assert.equal(source.includes("stripeClient"), false);
  assert.equal(source.includes("paymentIntents"), false);
});

test("a legacy preview without an access offer stays compatible", async () => {
  const db = memory({
    service_request_matches: [{
      id: MATCH,
      specialist_id: SPEC,
      service_request_id: REQUEST,
      status: "active",
      opened_at: null,
      matched_at: "2026-09-27T16:05:00.000Z",
    }],
    service_requests: [{
      id: REQUEST,
      requested_service: "психолог",
      description: "опис",
      city: "Berlin",
      postal_code: "10115",
      work_format: "online",
      service_languages: ["uk"],
      client_budget_text: "до 50 євро",
      created_at: "2026-09-27T16:00:00.000Z",
      selected_specialist_id: null,
    }],
    request_offers: [],
    service_request_claims: [],
    request_offer_payments: [],
    inbox_items: [],
  });
  const result = await readOwnedMatchPreview(db.supabase, { matchId: MATCH, specialistId: SPEC, userId: SPEC });
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.preview.match_id, MATCH);
  assert.equal(result.preview.service_request_id, REQUEST);
  assert.equal(result.preview.match_status, "active");
  assert.equal(result.preview.offer_state, "open");
  assert.equal(result.preview.access_offer, null);
  assert.equal(result.preview.payment_required, false);
  assert.equal(result.preview.conversation_id, null);
  assert.equal(result.preview.description, "опис");
  assert.deepEqual(result.preview.commercial_connection, {
    state: "request_presented",
    claim_id: null,
    payment_id: null,
    amount_cents: null,
    currency: null,
    confirmation_expires_at: null,
  });
});

test("a rejected match preview reports declined without restoring the request body", async () => {
  const db = memory({
    service_request_matches: [{
      id: MATCH,
      specialist_id: SPEC,
      service_request_id: REQUEST,
      status: "not_selected",
      opened_at: null,
      matched_at: "2026-09-27T16:05:00.000Z",
    }],
    service_requests: [{
      id: REQUEST,
      requested_service: "коуч",
      description: "опис",
      client_email: "hidden@example.test",
      selected_specialist_id: null,
    }],
    request_offers: [{
      id: OFFER,
      service_request_id: REQUEST,
      specialist_id: SPEC,
      request_kind: "service_request",
      offer_reason: "matched",
      billing_model: "pay_per_lead",
      currency: "eur",
      status: "offered",
      price_cents: 2500,
      idempotency_key: buildMatchedServiceRequestOfferIdempotencyKey({ requestId: REQUEST, specialistId: SPEC }),
    }],
    service_request_claims: [{
      id: CLAIM,
      status: "released",
      service_request_id: REQUEST,
      match_id: MATCH,
      specialist_id: SPEC,
      request_offer_id: OFFER,
      client_confirmed_at: null,
      client_rejected_at: "2026-09-29T19:00:00.000Z",
      confirmation_expires_at: DEADLINE,
      payment_rail: "stripe",
      release_reason: "client_rejected",
    }],
    request_offer_payments: [],
    request_offer_access_grants: [],
  });
  const result = await loadOwnedMatchPreview(db.supabase, { matchId: MATCH, specialistId: SPEC });
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.preview.offer_state, "unavailable");
  assert.equal(result.preview.description, null);
  assert.equal(result.preview.commercial_connection?.state, "declined");
  assert.equal(result.preview.commercial_connection?.claim_id, CLAIM);
  assert.equal(JSON.stringify(result.preview).includes("hidden@example.test"), false);
  assert.equal(db.writes.length, 0);
});

test("an incoherent paid claim preview does not look like a fresh connect offer", async () => {
  const db = memory({
    service_request_matches: [{
      id: MATCH,
      specialist_id: SPEC,
      service_request_id: REQUEST,
      status: "active",
      opened_at: null,
      matched_at: "2026-09-27T16:05:00.000Z",
    }],
    service_requests: [{
      id: REQUEST,
      requested_service: "коуч",
      description: "опис",
      selected_specialist_id: null,
    }],
    request_offers: [{
      id: OFFER,
      service_request_id: REQUEST,
      specialist_id: SPEC,
      request_kind: "service_request",
      offer_reason: "matched",
      billing_model: "pay_per_lead",
      currency: "eur",
      status: "offered",
      price_cents: 2500,
      idempotency_key: buildMatchedServiceRequestOfferIdempotencyKey({ requestId: REQUEST, specialistId: SPEC }),
    }],
    service_request_claims: [{
      id: CLAIM,
      status: "reserved",
      service_request_id: REQUEST,
      match_id: MATCH,
      specialist_id: SPEC,
      request_offer_id: OFFER,
      client_confirmed_at: null,
      client_rejected_at: null,
      confirmation_expires_at: DEADLINE,
      payment_rail: "stripe",
      release_reason: null,
    }],
    request_offer_payments: [{
      id: PAYMENT,
      service_request_claim_id: CLAIM,
      offer_id: OFFER,
      specialist_id: SPEC,
      amount_cents: 2500,
      currency: "eur",
      status: "paid",
    }],
    request_offer_access_grants: [],
    conversations: [],
    inbox_items: [],
  });
  const before = {
    claims: db.tables.service_request_claims.length,
    payments: db.tables.request_offer_payments.length,
    conversations: db.tables.conversations.length,
  };
  const result = await loadOwnedMatchPreview(db.supabase, { matchId: MATCH, specialistId: SPEC });
  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.preview.commercial_connection, null);
  assert.equal(result.preview.payment_required, false);
  assert.equal(result.preview.conversation_id, null);
  assert.equal(JSON.stringify(result.preview).includes("request_presented"), false);
  assert.equal(JSON.stringify(result.preview).includes(CLAIM), false);
  assert.equal(JSON.stringify(result.preview).includes(PAYMENT), false);
  assert.equal(db.writes.length, 0);
  assert.equal(db.tables.service_request_claims.length, before.claims);
  assert.equal(db.tables.request_offer_payments.length, before.payments);
  assert.equal(db.tables.conversations.length, before.conversations);
});
