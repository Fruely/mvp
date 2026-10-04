import assert from "node:assert/strict";
import test from "node:test";

import { buildMatchedServiceRequestOfferIdempotencyKey } from "../leadEngine/requestOfferPolicy.ts";
import {
  authoritativeReservedClaimId,
  derivePaymentRequired,
  isActiveRequestOfferPaymentStatus,
  type PaymentRequiredClaim,
  type PaymentRequiredOffer,
} from "./serviceRequestPaidAccessState.ts";

const REQUEST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MATCH = "11111111-1111-4111-8111-111111111111";
const SPEC = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OFFER = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const CLAIM = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function offer(overrides: Partial<PaymentRequiredOffer> = {}): PaymentRequiredOffer {
  return {
    id: OFFER,
    requestKind: "service_request",
    offerReason: "matched",
    billingModel: "pay_per_lead",
    serviceRequestId: REQUEST,
    specialistId: SPEC,
    currency: "eur",
    priceCents: 7000,
    idempotencyKey: buildMatchedServiceRequestOfferIdempotencyKey({
      requestId: REQUEST,
      specialistId: SPEC,
    }),
    ...overrides,
  };
}

function claim(overrides: Partial<PaymentRequiredClaim> = {}): PaymentRequiredClaim {
  return {
    id: CLAIM,
    status: "reserved",
    serviceRequestId: REQUEST,
    matchId: MATCH,
    specialistId: SPEC,
    requestOfferId: OFFER,
    clientConfirmedAt: "2026-09-30T12:00:00.000Z",
    ...overrides,
  };
}

function required(overrides: Partial<Parameters<typeof derivePaymentRequired>[0]> = {}) {
  return derivePaymentRequired({
    requestId: REQUEST,
    matchId: MATCH,
    specialistId: SPEC,
    offer: offer(),
    claim: claim(),
    grants: [],
    payments: [],
    ...overrides,
  });
}

test("payment_required is false without a claim or before client confirmation", () => {
  assert.equal(required({ claim: null }), false);
  assert.equal(required({ claim: claim({ clientConfirmedAt: null }) }), false);
});

test("payment_required is true only for a confirmed reservation with no active payment or grant", () => {
  assert.equal(required(), true);
  assert.equal(required({ payments: [] }), true);
});

test("pending, authorized, and paid payments suppress a second charge", () => {
  for (const status of ["pending", "authorized", "paid"]) {
    assert.equal(isActiveRequestOfferPaymentStatus(status), true);
    assert.equal(required({ payments: [{ claimId: CLAIM, status }] }), false);
  }
});

test("failed, expired, released, refunded, and disputed payments stay inactive", () => {
  for (const status of ["failed", "expired", "released", "refunded", "disputed"]) {
    assert.equal(isActiveRequestOfferPaymentStatus(status), false);
    assert.equal(required({ payments: [{ claimId: CLAIM, status }] }), true);
  }
});

test("an active grant suppresses payment_required and a revoked grant does not", () => {
  assert.equal(
    required({ grants: [{ offerId: OFFER, specialistId: SPEC, revokedAt: null }] }),
    false,
  );
  assert.equal(
    required({
      grants: [{ offerId: OFFER, specialistId: SPEC, revokedAt: "2026-09-30T13:00:00.000Z" }],
    }),
    true,
  );
});

test("terminal claims and a mismatched claim or offer do not ask for payment", () => {
  for (const status of ["completed", "released", "expired", "failed"]) {
    assert.equal(required({ claim: claim({ status }) }), false);
  }
  assert.equal(required({ claim: claim({ specialistId: "cccccccc-cccc-4ccc-8ccc-dddddddddddd" }) }), false);
  assert.equal(
    required({ claim: claim({ requestOfferId: "ffffffff-ffff-4fff-8fff-ffffffffffff" }) }),
    false,
  );
  assert.equal(required({ offer: offer({ requestKind: "direct_lead" }) }), false);
  assert.equal(required({ offer: offer({ priceCents: null }) }), false);
  assert.equal(required({ offer: offer({ priceCents: 0 }) }), false);
});

test("the preview claim id is the one reserved claim for this match", () => {
  const input = {
    requestId: REQUEST,
    matchId: MATCH,
    specialistId: SPEC,
    offers: [offer()],
    claims: [claim()],
    grants: [],
    payments: [],
  };
  assert.equal(authoritativeReservedClaimId(input), CLAIM);
  assert.equal(
    authoritativeReservedClaimId({ ...input, payments: [{ claimId: CLAIM, status: "paid" }] }),
    null,
  );
  assert.equal(authoritativeReservedClaimId({ ...input, claims: [] }), null);
  assert.equal(
    authoritativeReservedClaimId({
      ...input,
      claims: [claim(), claim({ id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" })],
    }),
    null,
  );
  assert.equal(
    authoritativeReservedClaimId({
      ...input,
      claims: [claim({ matchId: "22222222-2222-4222-8222-222222222222" })],
    }),
    null,
  );
  assert.equal(
    authoritativeReservedClaimId({
      ...input,
      claims: [claim({ specialistId: "ffffffff-ffff-4fff-8fff-ffffffffffff" })],
    }),
    null,
  );
});
