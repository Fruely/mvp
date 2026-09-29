import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDirectLeadOfferIdempotencyKey,
  buildDirectLeadShadowOffer,
  buildMatchedServiceRequestOffer,
  buildMatchedServiceRequestOfferIdempotencyKey,
} from "@/lib/leadEngine/requestOfferPolicy";

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

test("matched service-request offer stays unpriced and idempotent", () => {
  const input = {
    requestId: "11111111-1111-4111-8111-111111111111",
    specialistId: "22222222-2222-4222-8222-222222222222",
  };
  const offer = buildMatchedServiceRequestOffer(input);
  assert.deepEqual(offer, {
    request_kind: "service_request",
    lead_id: null,
    service_request_id: input.requestId,
    promotion_id: null,
    specialist_id: input.specialistId,
    offer_reason: "matched",
    pricing_segment: "consumer",
    billing_model: "pay_per_lead",
    price_cents: null,
    currency: "eur",
    status: "offered",
    idempotency_key: buildMatchedServiceRequestOfferIdempotencyKey(input),
  });
  assert.equal(
    offer.idempotency_key,
    "service-request:11111111-1111-4111-8111-111111111111:specialist:22222222-2222-4222-8222-222222222222:matched:initial",
  );
  assert.equal("price" in offer, false);
});
