import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

import assert from "node:assert/strict";
import test from "node:test";

const {
  isValidPublishableServicePricing,
  publicPriceShowsZeroEuro,
  resolvePublicServicePriceView,
} = await import("./pricing.ts");
const { hasValidServiceForPublish, validatePublication } = await import(
  "../dashboard/publicationValidator.ts"
);
const { isValidActiveServiceForPublication } = await import("./validation.ts");

const COPY = {
  thirdPartyFunded: "Оплата через Jobcenter / Kostenträger",
  afterAssessment: "Цена после оценки",
};

const BONN = {
  name: "Anna",
  categoryId: "cat-child",
  categoryParentId: "cat-root",
  languages: ["de"],
  workFormat: "online",
  countryCode: "DE",
  postalCode: "53115",
  city: "Bonn",
  lat: 50.7374,
  lng: 7.0982,
  serviceRadiusKm: null,
};

test("A: positive price without exception is valid", () => {
  assert.equal(
    isValidPublishableServicePricing({ price_from: 50, pricing_type: "fixed" }),
    true,
  );
});

test("B: zero without exception is invalid", () => {
  assert.equal(
    isValidPublishableServicePricing({ price_from: 0, pricing_type: "fixed" }),
    false,
  );
});

test("C: missing price without exception is invalid", () => {
  assert.equal(isValidPublishableServicePricing({ pricing_type: "fixed" }), false);
  assert.equal(
    isValidPublishableServicePricing({ price_from: null, pricing_type: "fixed" }),
    false,
  );
});

test("D: THIRD_PARTY_FUNDED plus explanation is valid without numeric price", () => {
  assert.equal(
    isValidPublishableServicePricing({
      price_from: 0,
      pricing_exception: "THIRD_PARTY_FUNDED",
      price_comment: "Оплата через Jobcenter",
    }),
    true,
  );
  assert.equal(
    isValidPublishableServicePricing({
      pricing_exception: "THIRD_PARTY_FUNDED",
      price_comment: "Kostenträger übernimmt die Kosten",
    }),
    true,
  );
});

test("E: AFTER_ASSESSMENT plus explanation is valid without numeric price", () => {
  assert.equal(
    isValidPublishableServicePricing({
      price_from: 0,
      pricing_exception: "AFTER_ASSESSMENT",
      price_comment: "Preis nach Besichtigung",
    }),
    true,
  );
});

test("F: exception without explanation is invalid", () => {
  assert.equal(
    isValidPublishableServicePricing({
      price_from: 0,
      pricing_exception: "AFTER_ASSESSMENT",
      price_comment: "   ",
    }),
    false,
  );
  assert.equal(
    isValidPublishableServicePricing({
      pricing_exception: "THIRD_PARTY_FUNDED",
    }),
    false,
  );
});

test("G: positive price plus optional explanation is valid", () => {
  assert.equal(
    isValidPublishableServicePricing({
      price_from: 80,
      price_comment: "inkl. Anfahrt",
      pricing_type: "fixed",
    }),
    true,
  );
});

test("generic comment alone does not bypass the price requirement", () => {
  assert.equal(
    isValidPublishableServicePricing({
      price_from: 0,
      price_comment: "по договорённости",
    }),
    false,
  );
});

test("unsupported exception values are not valid", () => {
  assert.equal(
    isValidPublishableServicePricing({
      price_from: 0,
      pricing_exception: "BY_AGREEMENT",
      price_comment: "по договорённости",
    }),
    false,
  );
});

test("public rendering never shows 0 € for exception services", () => {
  const funded = resolvePublicServicePriceView(
    {
      price_from: 0,
      pricing_exception: "THIRD_PARTY_FUNDED",
      price_comment: "Jobcenter",
    },
    COPY,
  );
  const assessment = resolvePublicServicePriceView(
    {
      price_from: 0,
      pricing_exception: "AFTER_ASSESSMENT",
      price_comment: "nach Besichtigung",
    },
    COPY,
  );
  assert.equal(funded.kind, "exception");
  assert.equal(funded.main, COPY.thirdPartyFunded);
  assert.equal(funded.explanation, "Jobcenter");
  assert.equal(assessment.kind, "exception");
  assert.equal(assessment.main, COPY.afterAssessment);
  assert.equal(publicPriceShowsZeroEuro(funded), false);
  assert.equal(publicPriceShowsZeroEuro(assessment), false);
  assert.doesNotMatch(funded.main, /0\s*€/);
  assert.doesNotMatch(assessment.main, /0\s*€/);
});

test("public rendering keeps numeric prices", () => {
  const view = resolvePublicServicePriceView(
    { price_from: 50, pricing_type: "fixed", price_comment: "inkl. MwSt." },
    COPY,
  );
  assert.equal(view.kind, "numeric");
  assert.equal(view.main, "50 €");
  assert.equal(view.explanation, "inkl. MwSt.");
});

test("publication readiness accepts a valid typed exception", () => {
  assert.equal(
    hasValidServiceForPublish([
      {
        title: "Jobcenter coaching",
        price_from: 0,
        is_active: true,
        pricing_exception: "THIRD_PARTY_FUNDED",
        price_comment: "Jobcenter",
      },
    ]),
    true,
  );
  const ready = validatePublication({
    ...BONN,
    servicesInSelectedCategory: [
      {
        title: "Inspection",
        price_from: 0,
        is_active: true,
        pricing_exception: "AFTER_ASSESSMENT",
        price_comment: "nach Besichtigung",
      },
    ],
  });
  assert.equal(ready.ready, true);
});

test("publication rejects a naked zero", () => {
  assert.equal(
    hasValidServiceForPublish([{ title: "X", price_from: 0, is_active: true }]),
    false,
  );
  const blocked = validatePublication({
    ...BONN,
    servicesInSelectedCategory: [{ title: "X", price_from: 0, is_active: true }],
  });
  assert.equal(blocked.ready, false);
  assert.ok(blocked.blocking.some((issue) => issue.code === "services_required"));
});

test("create/update publication helper uses the same canonical pricing rule", () => {
  const funded = {
    is_active: true,
    category_id: "cat",
    title: "Funded",
    pricing_type: "fixed",
    price_from: 0,
    pricing_exception: "THIRD_PARTY_FUNDED",
    price_comment: "Jobcenter",
  };
  assert.equal(isValidActiveServiceForPublication(funded, "cat"), true);
  assert.equal(isValidPublishableServicePricing(funded), true);
});
