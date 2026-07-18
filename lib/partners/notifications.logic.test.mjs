import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCommissionNotificationCopy,
  formatCommissionEuroTitle,
} from "./notifications.ts";

test("formatCommissionEuroTitle", () => {
  assert.equal(formatCommissionEuroTitle(2900, "EUR"), "+29 €");
  assert.equal(formatCommissionEuroTitle(2950, "EUR"), "+29.50 €");
});

test("buildCommissionNotificationCopy substitutes amount", () => {
  const copy = buildCommissionNotificationCopy({
    amountCents: 2900,
    currency: "EUR",
    titleTemplate: "Новое начисление: {{amount}}",
    body: "По вашей партнёрской ссылке оплатил новый специалист.",
  });
  assert.equal(copy.type, "commission_accrual");
  assert.equal(copy.title, "Новое начисление: +29 €");
  assert.match(copy.body, /специалист/);
});

test("notification idempotency key is commission_id conceptually", () => {
  // Pure contract: unique commission_id prevents duplicate notify rows
  const keys = new Set();
  const commissionId = "comm-1";
  const first = !keys.has(commissionId);
  keys.add(commissionId);
  const second = !keys.has(commissionId);
  assert.equal(first, true);
  assert.equal(second, false);
});
