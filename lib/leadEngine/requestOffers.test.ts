import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildDirectLeadOfferIdempotencyKey,
  buildDirectLeadShadowOffer,
  buildMatchedServiceRequestOffer,
  buildMatchedServiceRequestOfferIdempotencyKey,
} from "@/lib/leadEngine/requestOfferPolicy";
import { ensureMatchedServiceRequestOffers } from "@/lib/leadEngine/matchedServiceRequestOffer";
import { resolveServiceRequestAccessPrice } from "@/lib/leadEngine/serviceRequestAccessPricing";

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

test("matched service-request offer snapshots the shared access price", () => {
  const input = {
    requestId: "11111111-1111-4111-8111-111111111111",
    specialistId: "22222222-2222-4222-8222-222222222222",
  };
  const pricing = resolveServiceRequestAccessPrice("500 €");
  const offer = buildMatchedServiceRequestOffer({ ...input, pricing });
  assert.equal(offer.price_cents, 2500);
  assert.equal(offer.currency, "eur");
  assert.equal(offer.max_buyers_snapshot, 1);
  assert.equal(offer.pricing_rule_id, null);
  assert.equal(offer.estimated_service_value_min_cents, 50000);
  assert.equal(offer.estimated_service_value_max_cents, 50000);
  assert.equal(offer.idempotency_key, buildMatchedServiceRequestOfferIdempotencyKey(input));
  assert.equal(offer.billing_model, "pay_per_lead");
  assert.equal(offer.offer_reason, "matched");
});

const COMMERCIAL = { SERVICE_REQUEST_COMMERCIAL_OFFERS_ENABLED: "true" };
const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const SPECIALIST_A = "22222222-2222-4222-8222-222222222222";
const SPECIALIST_B = "33333333-3333-4333-8333-333333333333";

function commercialDb(input: {
  budget: string | null;
  acceptedCents?: number | null;
  existing?: Record<string, unknown>[];
  capableSpecialistIds?: string[];
}) {
  const rows = (input.existing ?? []).map((row) => ({ ...row }));
  const specialists = (input.capableSpecialistIds ?? []).map((id) => ({
    id,
    user_id: `user-${id}`,
  }));
  const installations = (input.capableSpecialistIds ?? []).map((id) => ({
    user_id: `user-${id}`,
    active: true,
    capabilities: ["paid_request_access_v1"],
  }));
  const inserts: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];
  const tables: string[] = [];
  function tableRows(table: string): Record<string, unknown>[] {
    if (table === "specialists") return specialists;
    if (table === "native_installations") return installations;
    return rows;
  }
  const supabase = {
    from(table: string) {
      tables.push(table);
      const filters: Array<(row: Record<string, unknown>) => boolean> = [];
      let patch: Record<string, unknown> | null = null;
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
          filters.push((row) => (value === null ? row[column] == null : row[column] === value));
          return api;
        },
        insert: async (row: Record<string, unknown>) => {
          inserts.push(row);
          if (rows.some((existing) => existing.idempotency_key === row.idempotency_key)) {
            return { error: { code: "23505" } };
          }
          rows.push({ ...row });
          return { error: null };
        },
        update(next: Record<string, unknown>) {
          patch = next;
          return api;
        },
        maybeSingle: async () => {
          if (table === "service_requests") {
            return {
              data: {
                id: REQUEST_ID,
                client_budget_text: input.budget,
                budget_reconciliation_accepted_cents: input.acceptedCents ?? null,
              },
              error: null,
            };
          }
          const found = tableRows(table).filter((row) => filters.every((filter) => filter(row)));
          return { data: found[0] ? { ...found[0] } : null, error: null };
        },
        then(
          resolve: (value: { data?: Record<string, unknown>[]; error: null }) => unknown,
          reject?: (reason: unknown) => unknown,
        ) {
          if (patch) {
            updates.push({ ...patch });
            for (const row of tableRows(table)) {
              if (filters.every((filter) => filter(row))) Object.assign(row, patch);
            }
            return Promise.resolve({ error: null }).then(resolve, reject);
          }
          const data = tableRows(table)
            .filter((row) => filters.every((filter) => filter(row)))
            .map((row) => ({ ...row }));
          return Promise.resolve({ data, error: null }).then(resolve, reject);
        },
      };
      return api;
    },
  };
  return { supabase, inserts, updates, rows, tables, installations };
}

function canonicalOffer(specialistId: string, price: number | null) {
  return {
    idempotency_key: buildMatchedServiceRequestOfferIdempotencyKey({
      requestId: REQUEST_ID,
      specialistId,
    }),
    request_kind: "service_request",
    service_request_id: REQUEST_ID,
    specialist_id: specialistId,
    offer_reason: "matched",
    billing_model: "pay_per_lead",
    currency: "eur",
    price_cents: price,
  };
}

test("commercial offers stay off without reading pricing tables", async () => {
  const db = commercialDb({ budget: "500 €" });
  const result = await ensureMatchedServiceRequestOffers(
    db.supabase as never,
    { requestId: REQUEST_ID, specialistIds: [SPECIALIST_A] },
    {},
  );
  assert.deepEqual(result, { ok: true, kind: "disabled" });
  assert.deepEqual(db.tables, []);
  assert.equal(db.inserts.length, 0);
});

test("one request gets the same priced snapshot for every matched specialist", async () => {
  const db = commercialDb({ budget: "500 €", capableSpecialistIds: [SPECIALIST_A, SPECIALIST_B] });
  const result = await ensureMatchedServiceRequestOffers(
    db.supabase as never,
    { requestId: REQUEST_ID, specialistIds: [SPECIALIST_A, SPECIALIST_B, SPECIALIST_A] },
    COMMERCIAL,
  );
  assert.deepEqual(result, { ok: true, kind: "ready" });
  assert.equal(db.rows.length, 2);
  assert.deepEqual(
    db.rows.map((row) => row.price_cents),
    [2500, 2500],
  );
  assert.deepEqual(
    db.rows.map((row) => row.max_buyers_snapshot),
    [1, 1],
  );
  assert.deepEqual(
    db.rows.map((row) => row.estimated_service_value_max_cents),
    [50000, 50000],
  );
  assert.equal(db.tables.includes("lead_pricing_rules"), false);
});

test("no budget still prices the floor and a retry does not reprice", async () => {
  const db = commercialDb({ budget: null, capableSpecialistIds: [SPECIALIST_A] });
  const first = await ensureMatchedServiceRequestOffers(
    db.supabase as never,
    { requestId: REQUEST_ID, specialistIds: [SPECIALIST_A] },
    COMMERCIAL,
  );
  db.rows[0].price_cents = 9900;
  const second = await ensureMatchedServiceRequestOffers(
    db.supabase as never,
    { requestId: REQUEST_ID, specialistIds: [SPECIALIST_A] },
    COMMERCIAL,
  );
  assert.deepEqual(first, { ok: true, kind: "ready" });
  assert.equal(db.inserts[0]?.price_cents, 2500);
  assert.deepEqual(second, { ok: true, kind: "ready" });
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0]?.price_cents, 9900);
  assert.equal(db.updates.length, 0);
});

test("a null-price canonical offer is priced once and a conflicting offer fails", async () => {
  const missing = commercialDb({
    budget: "до 80 евро",
    existing: [canonicalOffer(SPECIALIST_A, null)],
    capableSpecialistIds: [SPECIALIST_A],
  });
  const priced = await ensureMatchedServiceRequestOffers(
    missing.supabase as never,
    { requestId: REQUEST_ID, specialistIds: [SPECIALIST_A] },
    COMMERCIAL,
  );
  assert.deepEqual(priced, { ok: true, kind: "ready" });
  assert.equal(missing.updates.length, 1);
  assert.equal(missing.rows[0]?.price_cents, 2500);
  assert.equal(missing.rows[0]?.estimated_service_value_min_cents, null);
  assert.equal(missing.rows[0]?.estimated_service_value_max_cents, 8000);
  assert.equal(missing.rows[0]?.max_buyers_snapshot, 1);
  const again = await ensureMatchedServiceRequestOffers(
    missing.supabase as never,
    { requestId: REQUEST_ID, specialistIds: [SPECIALIST_A] },
    COMMERCIAL,
  );
  assert.deepEqual(again, { ok: true, kind: "ready" });
  assert.equal(missing.updates.length, 1);

  const conflict = commercialDb({
    budget: "500 €",
    existing: [{ ...canonicalOffer(SPECIALIST_A, 4000), billing_model: "subscription" }],
    capableSpecialistIds: [SPECIALIST_A],
  });
  const failed = await ensureMatchedServiceRequestOffers(
    conflict.supabase as never,
    { requestId: REQUEST_ID, specialistIds: [SPECIALIST_A] },
    COMMERCIAL,
  );
  assert.deepEqual(failed, { ok: false, kind: "offer_write_failed" });
  assert.equal(conflict.updates.length, 0);
  assert.equal(JSON.stringify(failed).includes(SPECIALIST_B), false);
});

test("a capable specialist is required before a new paid offer is introduced", async () => {
  const legacy = commercialDb({ budget: "500 €" });
  const skipped = await ensureMatchedServiceRequestOffers(
    legacy.supabase as never,
    { requestId: REQUEST_ID, specialistIds: [SPECIALIST_A, SPECIALIST_B] },
    COMMERCIAL,
  );
  assert.deepEqual(skipped, { ok: true, kind: "ready" });
  assert.equal(legacy.inserts.length, 0);

  const mixed = commercialDb({ budget: "500 €", capableSpecialistIds: [SPECIALIST_A] });
  const result = await ensureMatchedServiceRequestOffers(
    mixed.supabase as never,
    { requestId: REQUEST_ID, specialistIds: [SPECIALIST_A, SPECIALIST_B] },
    COMMERCIAL,
  );
  assert.deepEqual(result, { ok: true, kind: "ready" });
  assert.deepEqual(
    mixed.rows.map((row) => row.specialist_id),
    [SPECIALIST_A],
  );
  assert.equal(mixed.rows[0]?.price_cents, 2500);
});

test("budget text and an accepted ceiling do not change the connection fee", async () => {
  const low = commercialDb({ budget: "до 80 евро", capableSpecialistIds: [SPECIALIST_A] });
  assert.deepEqual(
    await ensureMatchedServiceRequestOffers(
      low.supabase as never,
      { requestId: REQUEST_ID, specialistIds: [SPECIALIST_A] },
      COMMERCIAL,
    ),
    { ok: true, kind: "ready" },
  );
  assert.equal(low.rows[0]?.price_cents, 2500);
  assert.equal(low.rows[0]?.currency, "eur");
  assert.equal(low.rows[0]?.estimated_service_value_max_cents, 8000);

  const high = commercialDb({ budget: "10000 €", capableSpecialistIds: [SPECIALIST_A] });
  assert.deepEqual(
    await ensureMatchedServiceRequestOffers(
      high.supabase as never,
      { requestId: REQUEST_ID, specialistIds: [SPECIALIST_A] },
      COMMERCIAL,
    ),
    { ok: true, kind: "ready" },
  );
  assert.equal(high.rows[0]?.price_cents, 2500);
  assert.equal(high.rows[0]?.estimated_service_value_max_cents, 1_000_000);

  const ceiling = commercialDb({
    budget: "80 €",
    acceptedCents: 2_000_000,
    capableSpecialistIds: [SPECIALIST_A],
  });
  assert.deepEqual(
    await ensureMatchedServiceRequestOffers(
      ceiling.supabase as never,
      { requestId: REQUEST_ID, specialistIds: [SPECIALIST_A] },
      COMMERCIAL,
    ),
    { ok: true, kind: "ready" },
  );
  assert.equal(ceiling.rows[0]?.price_cents, 2500);
  assert.equal(ceiling.rows[0]?.estimated_service_value_min_cents, 2_000_000);
  assert.equal(ceiling.rows[0]?.estimated_service_value_max_cents, 2_000_000);

  ceiling.rows[0].price_cents = 2500;
  const again = await ensureMatchedServiceRequestOffers(
    ceiling.supabase as never,
    { requestId: REQUEST_ID, specialistIds: [SPECIALIST_A] },
    { ...COMMERCIAL },
  );
  assert.deepEqual(again, { ok: true, kind: "ready" });
  assert.equal(ceiling.rows[0]?.price_cents, 2500);
  assert.equal(ceiling.updates.length, 0);
});

test("a persisted positive offer stays priced after capability disappears", async () => {
  const db = commercialDb({
    budget: "500 €",
    existing: [canonicalOffer(SPECIALIST_A, 4000)],
  });
  const result = await ensureMatchedServiceRequestOffers(
    db.supabase as never,
    { requestId: REQUEST_ID, specialistIds: [SPECIALIST_A] },
    COMMERCIAL,
  );
  assert.deepEqual(result, { ok: true, kind: "ready" });
  assert.equal(db.rows.length, 1);
  assert.equal(db.rows[0]?.price_cents, 4000);
  assert.equal(db.inserts.length, 0);
  assert.equal(db.updates.length, 0);
});

test("offer preparation does not scan specialists outside the current match set", async () => {
  const db = commercialDb({
    budget: "500 €",
    existing: [canonicalOffer(SPECIALIST_B, 4000)],
    capableSpecialistIds: [SPECIALIST_A],
  });
  const result = await ensureMatchedServiceRequestOffers(
    db.supabase as never,
    { requestId: REQUEST_ID, specialistIds: [SPECIALIST_A] },
    COMMERCIAL,
  );
  assert.deepEqual(result, { ok: true, kind: "ready" });
  assert.equal(db.rows.filter((row) => row.specialist_id === SPECIALIST_B)[0]?.price_cents, 4000);
  assert.equal(db.rows.filter((row) => row.specialist_id === SPECIALIST_A).length, 1);
});

test("access pricing does not read shadow rules or payment-request budget text", () => {
  const pricing = readFileSync(new URL("./serviceRequestAccessPricing.ts", import.meta.url), "utf8");
  const offers = readFileSync(new URL("./matchedServiceRequestOffer.ts", import.meta.url), "utf8");
  const payment = readFileSync(
    new URL("../billing/createServiceRequestAuthorization.ts", import.meta.url),
    "utf8",
  );
  const direct = readFileSync(new URL("./requestOfferPolicy.ts", import.meta.url), "utf8");
  const matching = readFileSync(new URL("../matching/runMatching.ts", import.meta.url), "utf8");
  assert.equal(matching.includes("paid_request_access_v1"), false);
  assert.equal(pricing.includes("lead_pricing_rules"), false);
  assert.equal(offers.includes("lead_pricing_rules"), false);
  assert.equal(pricing.includes("shadowPricing"), false);
  assert.equal(offers.includes("shadowPricing"), false);
  assert.equal(payment.includes("client_budget_text"), false);
  assert.match(direct, /function buildDirectLeadShadowOffer[\s\S]*price_cents: null/);
});
