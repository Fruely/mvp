import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const processorPath = fileURLToPath(
  new URL("./processRequestOfferWebhook.ts", import.meta.url),
);
const aggregatePath = fileURLToPath(
  new URL("./processStripeBillingWebhook.ts", import.meta.url),
);

test("direct offer webhook only trusts Stripe success events with request-offer purpose", async () => {
  const src = await readFile(processorPath, "utf8");
  assert.match(src, /checkout\.session\.completed/);
  assert.match(src, /checkout\.session\.async_payment_succeeded/);
  assert.match(src, /metadata\.purpose !== PURPOSE/);
  assert.match(src, /payment_status !== "paid"/);
});

test("webhook validates stored session, amount, currency and payment intent", async () => {
  const src = await readFile(processorPath, "utf8");
  assert.match(src, /stripe_checkout_session_id !== session\.id/);
  assert.match(src, /amountTotal !== payment\.amount_cents/);
  assert.match(src, /currency !== payment\.currency\.toLowerCase\(\)/);
  assert.match(src, /!paymentIntentId/);
});

test("webhook creates grant only after payment is marked paid", async () => {
  const src = await readFile(processorPath, "utf8");
  assert.match(src, /status: "paid"/);
  assert.match(src, /request_offer_access_grants/);
  assert.match(src, /source_payment_id: payment\.id/);
  assert.ok(src.indexOf('status: "paid"') < src.lastIndexOf("grantAccess(supabase, paidPayment"));
});

test("grant fulfillment is idempotent and repairs offer paid state on retry", async () => {
  const src = await readFile(processorPath, "utf8");
  assert.match(src, /source_payment_id === payment\.id/);
  assert.match(src, /grantInsertError\.code === "23505"/);
  assert.match(src, /markOfferPaid/);
  assert.match(src, /status: "paid", paid_at: paidAt/);
});

test("aggregate billing webhook participates in retry and skipped semantics", async () => {
  const src = await readFile(aggregatePath, "utf8");
  assert.match(src, /processStripeWebhookEventForRequestOffers/);
  assert.match(src, /requestOffer: RequestOfferWebhookResult/);
  assert.match(src, /result\.requestOffer\.outcome === "retryable_failure"/);
  assert.match(src, /shouldMarkRequestOfferBillingEventSkipped/);
});
