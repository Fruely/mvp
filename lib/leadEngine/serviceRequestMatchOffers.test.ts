import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

import type { SpecialistResult, SpecialistSearchInput } from "@/lib/search/specialistSearch";
import type { ValidatedServiceRequestCreate } from "@/lib/serviceRequests/validation";

register(
  new URL("../serviceRequests/demandRoute.contract.hooks.mjs", import.meta.url).href,
);

const {
  buildServiceRequestMatchSearches,
  dedupeMatchedSpecialists,
  ensureServiceRequestMatchOffers,
  normalizeMatchOfferLimit,
} = await import("./serviceRequestMatchOffers.ts");

const request: ValidatedServiceRequestCreate = {
  client_name: "Anna",
  client_email: "anna@example.com",
  client_phone: null,
  description: "Нужен русскоязычный бухгалтер для декларации",
  requested_service: "Налоговая декларация",
  subcategory_text: null,
  client_budget_text: null,
  preferred_contact_method: "email",
  preferred_language: "ru",
  work_format: "online",
  city: null,
  postal_code: null,
  country_code: "DE",
  radius_km: null,
  urgency: "flexible",
  desired_date: null,
  service_timing: {
    service_timing_type: "flexible_period",
    service_timing_date: null,
    service_timing_time: null,
    service_timing_date_end: null,
    service_timing_period: "flexible",
    service_timing_note: null,
  },
  locale: "ru",
  category_id: "category-1",
  category_text: "Налоговые консультанты",
  source_path: "/ru/request",
};

function specialist(id: string): SpecialistResult {
  return {
    id,
    slug: `specialist-${id}`,
    name: `Specialist ${id}`,
    bio: null,
    avatar_url: null,
    category_id: "category-1",
    category_slug: "tax-consultants",
    category_title: "Tax consultants",
    category_title_ru: "Налоговые консультанты",
    category_title_de: "Steuerberater",
    category_title_ua: "Податкові консультанти",
    languages: ["ru"],
    work_format: "online",
    postal_code: null,
    photo_focus: null,
  };
}

test("online intent becomes one category-first online search", () => {
  assert.deepEqual(buildServiceRequestMatchSearches(request, "tax-consultants"), [
    {
      lang: "ru",
      category: "tax-consultants",
      q: null,
      radius: null,
      offset: 0,
      mode: "online",
      place: null,
    },
  ]);
});

test("free-text intent remains searchable when category normalization is unresolved", () => {
  const [search] = buildServiceRequestMatchSearches(
    { ...request, category_id: null, category_text: null },
    null,
  );
  assert.equal(search.category, null);
  assert.equal(search.q, "Налоговая декларация");
});

test("hybrid intent searches local and online supply and deduplicates specialists", () => {
  const searches = buildServiceRequestMatchSearches(
    {
      ...request,
      work_format: "hybrid",
      city: "Köln",
      postal_code: "50667",
      radius_km: 30,
    },
    "tax-consultants",
  );
  assert.equal(searches.length, 2);
  assert.equal(searches[0]?.place, "50667");
  assert.equal(searches[0]?.mode, null);
  assert.equal(searches[1]?.mode, "online");

  const first = specialist("one");
  const second = specialist("two");
  assert.deepEqual(
    dedupeMatchedSpecialists([{ data: [first, second] }, { data: [first] }], 10).map(
      (item) => item.id,
    ),
    ["one", "two"],
  );
});

test("match offer limit is bounded and defaults safely", () => {
  assert.equal(normalizeMatchOfferLimit(undefined), 10);
  assert.equal(normalizeMatchOfferLimit(0), 10);
  assert.equal(normalizeMatchOfferLimit(3.9), 3);
  assert.equal(normalizeMatchOfferLimit(999), 20);
});

test("enabled matcher creates idempotent PII-free offers for matched specialists", async () => {
  const inserted: Array<Record<string, unknown>> = [];
  const searches: SpecialistSearchInput[] = [];
  const fakeSupabase = {
    from(table: string) {
      if (table === "service_requests") {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: { id: "request-1" }, error: null };
                  },
                };
              },
            };
          },
        };
      }
      if (table === "categories") {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    return { data: { slug: "tax-consultants" }, error: null };
                  },
                };
              },
            };
          },
        };
      }
      if (table === "request_offers") {
        return {
          async insert(payload: Record<string, unknown>) {
            inserted.push(payload);
            return { error: null };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };

  const result = await ensureServiceRequestMatchOffers({
    supabase: fakeSupabase as never,
    publicId: "REQ-1",
    validated: request,
    enabled: true,
    search: async (input) => {
      searches.push(input);
      return { data: [specialist("one"), specialist("two")] };
    },
    resolveShadowPrice: async () => null,
  });

  assert.deepEqual(result, {
    kind: "completed",
    matched: 2,
    created: 2,
    existing: 0,
    failed: 0,
  });
  assert.equal(searches.length, 1);
  assert.equal(inserted.length, 2);
  assert.equal(inserted[0]?.service_request_id, "request-1");
  assert.equal(inserted[0]?.specialist_id, "one");
  assert.equal(inserted[0]?.offer_reason, "matched");
  assert.equal(inserted[0]?.price_cents, null);
  assert.equal(JSON.stringify(inserted).includes("anna@example.com"), false);
  assert.equal(JSON.stringify(inserted).includes("client_name"), false);
});

test("disabled matcher performs no database work", async () => {
  const fakeSupabase = {
    from() {
      throw new Error("database must not be called while disabled");
    },
  };
  const result = await ensureServiceRequestMatchOffers({
    supabase: fakeSupabase as never,
    publicId: "REQ-1",
    validated: request,
    enabled: false,
  });
  assert.deepEqual(result, { kind: "disabled" });
});
