import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeExplicitClientBudget,
  resolveServiceRequestAccessPrice,
  roundUpToNearestFiveEuros,
  serviceRequestAccessPriceCents,
} from "./serviceRequestAccessPricing.ts";

function priceForEuros(euros: number | null): number {
  return serviceRequestAccessPriceCents(euros == null ? null : euros * 100);
}

test("access price follows the v1 examples in cents", () => {
  const cases: Array<[number | null, number]> = [
    [null, 2500],
    [50, 2500],
    [80, 2500],
    [150, 2500],
    [250, 2500],
    [300, 3000],
    [500, 4000],
    [800, 5500],
    [1000, 6500],
    [1500, 7500],
    [3000, 10500],
    [5000, 14500],
    [10000, 24500],
    [20000, 25000],
  ];
  for (const [euros, cents] of cases) {
    assert.equal(priceForEuros(euros), cents, String(euros));
  }
});

test("tier and cap boundaries stay on the integer formula", () => {
  assert.equal(priceForEuros(250), 2500);
  assert.equal(priceForEuros(1000), 6500);
  assert.equal(priceForEuros(10250), 25000);
  assert.equal(serviceRequestAccessPriceCents(10_000_000), 25000);
});

test("nearest five euros rounds an exact halfway amount up", () => {
  assert.equal(roundUpToNearestFiveEuros(2501), 2500);
  assert.equal(roundUpToNearestFiveEuros(2749), 2500);
  assert.equal(roundUpToNearestFiveEuros(2750), 3000);
  assert.equal(roundUpToNearestFiveEuros(3750), 4000);
  assert.equal(roundUpToNearestFiveEuros(6250), 6500);
});

test("explicit EUR wording becomes one budget basis", () => {
  const exact = (text: string, euros: number) => {
    const budget = normalizeExplicitClientBudget(text);
    assert.deepEqual(budget, {
      basisCents: euros * 100,
      minCents: euros * 100,
      maxCents: euros * 100,
    });
  };
  exact("80", 80);
  exact("80 €", 80);
  exact("80 EUR", 80);
  exact("1.000 €", 1000);
  exact("1 000 €", 1000);

  assert.deepEqual(normalizeExplicitClientBudget("до 80 евро"), {
    basisCents: 8000,
    minCents: null,
    maxCents: 8000,
  });
  assert.deepEqual(normalizeExplicitClientBudget("bis 500 €"), {
    basisCents: 50000,
    minCents: null,
    maxCents: 50000,
  });
  assert.deepEqual(normalizeExplicitClientBudget("bis zu 500 €"), {
    basisCents: 50000,
    minCents: null,
    maxCents: 50000,
  });
  assert.deepEqual(normalizeExplicitClientBudget("от 500 €"), {
    basisCents: 50000,
    minCents: 50000,
    maxCents: null,
  });
  assert.deepEqual(normalizeExplicitClientBudget("ab 500 €"), {
    basisCents: 50000,
    minCents: 50000,
    maxCents: null,
  });
  assert.deepEqual(normalizeExplicitClientBudget("500-700 €"), {
    basisCents: 70000,
    minCents: 50000,
    maxCents: 70000,
  });
  assert.deepEqual(normalizeExplicitClientBudget("500–700 EUR"), {
    basisCents: 70000,
    minCents: 50000,
    maxCents: 70000,
  });
});

test("non-EUR, ambiguous, and missing text do not invent a basis", () => {
  for (const text of ["80 USD", "80 GBP", "80 CHF", "80 UAH", "80 $", "80 грн", "около 80 евро", "80 or 100 €", "500-700-900 €", ""]) {
    assert.equal(normalizeExplicitClientBudget(text), null, text);
  }
  assert.equal(normalizeExplicitClientBudget(null), null);
  assert.equal(normalizeExplicitClientBudget(undefined), null);
  assert.equal(resolveServiceRequestAccessPrice(null).priceCents, 2500);
  assert.equal(resolveServiceRequestAccessPrice("80 USD").priceCents, 2500);
  assert.equal(resolveServiceRequestAccessPrice("500-700 €").priceCents, 5000);
});
