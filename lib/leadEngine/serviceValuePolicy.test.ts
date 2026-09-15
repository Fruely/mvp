import assert from "node:assert/strict";
import test from "node:test";

import { deriveHighestShadowServiceValue } from "@/lib/leadEngine/serviceValuePolicy";

const categoryId = "11111111-1111-1111-1111-111111111111";

test("uses one active EUR fixed service as a generic pricing anchor", () => {
  assert.deepEqual(
    deriveHighestShadowServiceValue(
      [
        {
          id: "22222222-2222-2222-2222-222222222222",
          category_id: categoryId,
          pricing_type: "fixed",
          price_from: "500.00",
          price_to: null,
          currency: "EUR",
          is_active: true,
        },
      ],
      categoryId,
    ),
    {
      specialistServiceId: null,
      estimatedServiceValueMinCents: 50000,
      estimatedServiceValueMaxCents: 50000,
    },
  );
});

test("uses the upper bound of an active EUR range service", () => {
  assert.deepEqual(
    deriveHighestShadowServiceValue(
      [
        {
          id: "33333333-3333-3333-3333-333333333333",
          category_id: categoryId,
          pricing_type: "range",
          price_from: 400,
          price_to: 600,
          currency: "eur",
          is_active: true,
        },
      ],
      categoryId,
    ),
    {
      specialistServiceId: null,
      estimatedServiceValueMinCents: 60000,
      estimatedServiceValueMaxCents: 60000,
    },
  );
});

test("uses the highest eligible service value when multiple services exist", () => {
  assert.deepEqual(
    deriveHighestShadowServiceValue(
      [
        {
          id: "a",
          category_id: categoryId,
          pricing_type: "fixed",
          price_from: 120,
          price_to: null,
          currency: "EUR",
          is_active: true,
        },
        {
          id: "b",
          category_id: categoryId,
          pricing_type: "fixed",
          price_from: 350,
          price_to: null,
          currency: "EUR",
          is_active: true,
        },
        {
          id: "c",
          category_id: categoryId,
          pricing_type: "fixed",
          price_from: 1000,
          price_to: null,
          currency: "EUR",
          is_active: true,
        },
      ],
      categoryId,
    ),
    {
      specialistServiceId: null,
      estimatedServiceValueMinCents: 100000,
      estimatedServiceValueMaxCents: 100000,
    },
  );
});

test("compares fixed values and range upper bounds", () => {
  assert.deepEqual(
    deriveHighestShadowServiceValue(
      [
        {
          id: "fixed",
          category_id: categoryId,
          pricing_type: "fixed",
          price_from: 800,
          price_to: null,
          currency: "EUR",
          is_active: true,
        },
        {
          id: "range",
          category_id: categoryId,
          pricing_type: "range",
          price_from: 700,
          price_to: 1200,
          currency: "EUR",
          is_active: true,
        },
      ],
      categoryId,
    ),
    {
      specialistServiceId: null,
      estimatedServiceValueMinCents: 120000,
      estimatedServiceValueMaxCents: 120000,
    },
  );
});

test("ignores hourly pricing as total engagement value", () => {
  assert.equal(
    deriveHighestShadowServiceValue(
      [
        {
          id: "hourly",
          category_id: categoryId,
          pricing_type: "hourly",
          price_from: 100,
          price_to: null,
          currency: "EUR",
          is_active: true,
        },
      ],
      categoryId,
    ),
    null,
  );
});

test("ignores inactive, non-EUR, invalid-range, and wrong-category services", () => {
  assert.equal(
    deriveHighestShadowServiceValue(
      [
        {
          id: "inactive",
          category_id: categoryId,
          pricing_type: "fixed",
          price_from: 500,
          price_to: null,
          currency: "EUR",
          is_active: false,
        },
        {
          id: "usd",
          category_id: categoryId,
          pricing_type: "fixed",
          price_from: 500,
          price_to: null,
          currency: "USD",
          is_active: true,
        },
        {
          id: "invalid-range",
          category_id: categoryId,
          pricing_type: "range",
          price_from: 500,
          price_to: 400,
          currency: "EUR",
          is_active: true,
        },
        {
          id: "wrong-category",
          category_id: "99999999-9999-9999-9999-999999999999",
          pricing_type: "fixed",
          price_from: 500,
          price_to: null,
          currency: "EUR",
          is_active: true,
        },
      ],
      categoryId,
    ),
    null,
  );
});
