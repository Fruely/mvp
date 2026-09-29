import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDirectLeadOfferIdempotencyKey,
  buildDirectLeadShadowOffer,
  buildMatchedServiceRequestOffer,
  buildMatchedServiceRequestOfferIdempotencyKey,
} from "@/lib/leadEngine/requestOfferPolicy";
import { ensureMatchedServiceRequestOffers } from "@/lib/leadEngine/matchedServiceRequestOffer";

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

const COMMERCIAL = { SERVICE_REQUEST_COMMERCIAL_OFFERS_ENABLED: "true" };

function offerStore(existing: Record<string, unknown> | null) {
  const inserts: Record<string, unknown>[] = [];
  const supabase = {
    from() {
      const filters: Array<[string, unknown]> = [];
      return {
        select() {
          return this;
        },
        eq(column: string, value: unknown) {
          filters.push([column, value]);
          return this;
        },
        insert: async (row: Record<string, unknown>) => {
          inserts.push(row);
          return { error: { code: "23505" } };
        },
        maybeSingle: async () => {
          if (!existing) return { data: null, error: null };
          const matches = filters.every(([column, value]) => existing[column] === value);
          return { data: matches ? existing : null, error: null };
        },
      };
    },
  };
  return { supabase, inserts };
}

test("a unique violation is idempotent only when the stored offer matches", async () => {
  const input = {
    requestId: "11111111-1111-4111-8111-111111111111",
    specialistId: "22222222-2222-4222-8222-222222222222",
  };
  const stored = buildMatchedServiceRequestOffer(input);
  const same = offerStore(stored);
  const ok = await ensureMatchedServiceRequestOffers(
    same.supabase as never,
    { requestId: input.requestId, specialistIds: [input.specialistId] },
    COMMERCIAL,
  );
  assert.deepEqual(ok, { ok: true, kind: "ready" });
  assert.equal(same.inserts.length, 1);

  const conflict = offerStore({
    ...stored,
    specialist_id: "33333333-3333-4333-8333-333333333333",
    billing_model: "subscription",
  });
  const failed = await ensureMatchedServiceRequestOffers(
    conflict.supabase as never,
    { requestId: input.requestId, specialistIds: [input.specialistId] },
    COMMERCIAL,
  );
  assert.deepEqual(failed, { ok: false, kind: "offer_write_failed" });
  assert.equal(JSON.stringify(failed).includes("33333333-3333-4333-8333-333333333333"), false);
});
