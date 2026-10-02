import assert from "node:assert/strict";
import test from "node:test";

import {
  CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS,
  normalizeExplicitClientBudget,
  resolveAcceptedCeilingAccessPrice,
  resolveServiceRequestAccessPrice,
} from "./serviceRequestAccessPricing.ts";

test("the matched connection fee stays 2500 cents for every budget", () => {
  assert.equal(CANONICAL_MATCHED_SERVICE_REQUEST_CONNECTION_FEE_CENTS, 2500);
  const cases = [null, "50 €", "до 80 евро", "500 €", "500-700 €", "10000 €", "20000 €"];
  for (const text of cases) {
    const price = resolveServiceRequestAccessPrice(text);
    assert.equal(price.priceCents, 2500, String(text));
    assert.equal(price.currency, "eur");
  }
  assert.equal(resolveAcceptedCeilingAccessPrice(2_000_000).priceCents, 2500);
  assert.equal(resolveAcceptedCeilingAccessPrice(0).priceCents, 2500);
  assert.equal(resolveServiceRequestAccessPrice(null).estimatedServiceValueMinCents, null);
  assert.equal(resolveServiceRequestAccessPrice("500 €").estimatedServiceValueMaxCents, 50000);
  assert.equal(resolveServiceRequestAccessPrice("до 80 евро").estimatedServiceValueMaxCents, 8000);
  assert.equal(resolveAcceptedCeilingAccessPrice(2_000_000).estimatedServiceValueMinCents, 2_000_000);
  assert.equal(resolveAcceptedCeilingAccessPrice(2_000_000).estimatedServiceValueMaxCents, 2_000_000);
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
  assert.equal(resolveServiceRequestAccessPrice("500-700 €").priceCents, 2500);
  assert.equal(resolveServiceRequestAccessPrice("500-700 €").estimatedServiceValueMaxCents, 70000);
});
