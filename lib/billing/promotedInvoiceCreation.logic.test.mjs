import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const accessCheckoutSrc = readFileSync(
  new URL("./createPromotedAccessCheckout.ts", import.meta.url),
  "utf8",
);
const reservationCheckoutSrc = readFileSync(
  new URL("./createPromotedReservationCheckout.ts", import.meta.url),
  "utf8",
);

test("promoted access Checkout enables post-payment invoice creation", () => {
  assert.match(accessCheckoutSrc, /invoice_creation:\s*\{\s*enabled:\s*true\s*\}/);
});

test("promoted reservation Checkout enables post-payment invoice creation", () => {
  assert.match(reservationCheckoutSrc, /invoice_creation:\s*\{\s*enabled:\s*true\s*\}/);
});
