import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDirectLeadOfferIdempotencyKey,
  buildDirectLeadShadowOffer,
} from "@/lib/leadEngine/requestOffers";

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
