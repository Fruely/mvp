import assert from "node:assert/strict";
import test from "node:test";

import { deriveUniqueShadowServiceValue } from "@/lib/leadEngine/serviceValuePolicy";

const categoryId = "11111111-1111-1111-1111-111111111111";

test("uses one active EUR fixed service", () => {
  assert.deepEqual(
    deriveUniqueShadowServiceValue(
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
      specialistServiceId: "22222222-2222-2222-2222-222222222222",
      estimatedServiceValueMinCents: 50000,
      estimatedServiceValueMaxCents: 50000,
    },
  );
});

test("uses one active EUR range service", () => {
  assert.deepEqual(
    deriveUniqueShadowServiceValue(
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
      specialistServiceId: "33333333-3333-3333-3333-333333333333",
      estimatedServiceValueMinCents: 40000,
      estimatedServiceValueMaxCents: 60000,
    },
  );
});

test("does not guess when multiple eligible services exist", () => {
  assert.equal(
    deriveUniqueShadowServiceValue(
      [
        {
          id: "a",
          category_id: categoryId,
          pricing_type: "fixed",
          price_from: 300,
          price_to: null,
          currency: "EUR",
          is_active: true,
        },
        {
          id: "b",
          category_id: categoryId,
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

test("ignores hourly pricing as total engagement value", () => {
  assert.equal(
    deriveUniqueShadowServiceValue(
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

test("ignores inactive, non-EUR, and wrong-category services", () => {
  assert.equal(
    deriveUniqueShadowServiceValue(
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
