import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDirectLeadOfferIdempotencyKey,
  buildDirectLeadShadowOffer,
  buildServiceRequestMatchOfferIdempotencyKey,
  buildServiceRequestMatchedShadowOffer,
} from "@/lib/leadEngine/requestOfferPolicy";

test("buildServiceRequestMatchOfferIdempotencyKey is stable per request and specialist", () => {
  assert.equal(
    buildServiceRequestMatchOfferIdempotencyKey({
      serviceRequestId: "11111111-1111-1111-1111-111111111111",
      specialistId: "22222222-2222-2222-2222-222222222222",
    }),
    "service-request:11111111-1111-1111-1111-111111111111:specialist:22222222-2222-2222-2222-222222222222:match:initial",
  );
});

test("buildServiceRequestMatchedShadowOffer creates a PII-free matched offer", () => {
  const offer = buildServiceRequestMatchedShadowOffer({
    serviceRequestId: "11111111-1111-1111-1111-111111111111",
    specialistId: "22222222-2222-2222-2222-222222222222",
  });

  assert.deepEqual(offer, {
    request_kind: "service_request",
    lead_id: null,
    service_request_id: "11111111-1111-1111-1111-111111111111",
    promotion_id: null,
    specialist_id: "22222222-2222-2222-2222-222222222222",
    offer_reason: "matched",
    pricing_segment: "professional",
    billing_model: "subscription",
    price_cents: null,
    currency: "eur",
    status: "offered",
    idempotency_key:
      "service-request:11111111-1111-1111-1111-111111111111:specialist:22222222-2222-2222-2222-222222222222:match:initial",
  });
  assert.equal(JSON.stringify(offer).includes("client_"), false);
});

test("buildDirectLeadOfferIdempotencyKey is stable for the same lead and specialist", () => {
  const input = {
    leadId: "11111111-1111-1111-1111-111111111111",
    specialistId: "22222222-2222-2222-2222-222222222222",
  };

  assert.equal(
    buildDirectLeadOfferIdempotencyKey(input),
    "direct-lead:11111111-1111-1111-1111-111111111111:specialist:22222222-2222-2222-2222-222222222222:initial",
  );
});

test("buildDirectLeadShadowOffer does not attach a client-selected specialist_service_id", () => {
  const offer = buildDirectLeadShadowOffer({
    leadId: "11111111-1111-1111-1111-111111111111",
    specialistId: "22222222-2222-2222-2222-222222222222",
  });

  assert.equal("specialist_service_id" in offer, false);
  assert.equal(offer.price_cents, null);
});

test("buildDirectLeadShadowOffer preserves current production economics", () => {
  const offer = buildDirectLeadShadowOffer({
    leadId: "11111111-1111-1111-1111-111111111111",
    specialistId: "22222222-2222-2222-2222-222222222222",
  });

  assert.deepEqual(offer, {
    request_kind: "direct_lead",
    lead_id: "11111111-1111-1111-1111-111111111111",
    service_request_id: null,
    promotion_id: null,
    specialist_id: "22222222-2222-2222-2222-222222222222",
    offer_reason: "direct_selection",
    pricing_segment: "professional",
    billing_model: "subscription",
    price_cents: null,
    currency: "eur",
    status: "offered",
    idempotency_key:
      "direct-lead:11111111-1111-1111-1111-111111111111:specialist:22222222-2222-2222-2222-222222222222:initial",
  });
});
