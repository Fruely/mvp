import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const batchPath = fileURLToPath(
  new URL("./accessDecisionBatch.ts", import.meta.url),
);
const tablePath = fileURLToPath(
  new URL("../../components/dashboard/LeadsTable.tsx", import.meta.url),
);
const pagePath = fileURLToPath(
  new URL("../../app/[lang]/specialist/(protected)/dashboard/leads/page.tsx", import.meta.url),
);

test("dashboard access batch reads only commercial entitlement state", async () => {
  const src = await readFile(batchPath, "utf8");
  assert.match(src, /request_offers/);
  assert.match(src, /request_offer_access_grants/);
  assert.match(src, /request_offer_payments/);
  assert.match(src, /resolveDirectLeadAccessDecision/);
  assert.doesNotMatch(src, /client_email/);
  assert.doesNotMatch(src, /client_phone/);
  assert.doesNotMatch(src, /\.insert\(/);
  assert.doesNotMatch(src, /\.update\(/);
  assert.doesNotMatch(src, /stripe/i);
});

test("dashboard page passes server-resolved decisions to client table", async () => {
  const src = await readFile(pagePath, "utf8");
  assert.match(src, /loadDashboardLeadAccessDecisions/);
  assert.match(src, /accessDecisions=\{accessDecisions\}/);
  assert.doesNotMatch(src, /canUnlockContacts=/);
});

test("lead table exposes guarded purchase CTA from server decision only", async () => {
  const src = await readFile(tablePath, "utf8");
  assert.match(src, /Стоимость заявки/);
  assert.match(src, /Включено в подписку/);
  assert.match(src, /Платёж обрабатывается/);
  assert.match(src, /decision\?\.state === "unlocked"/);
  assert.match(src, /decision\?\.state === "locked" && decision\.canPurchase/);
  assert.match(src, /request-offers\/checkout/);
  assert.match(src, /JSON\.stringify\(\{ offer_id: offerId, lang \}\)/);
  assert.match(src, /checkout_url/);
  assert.doesNotMatch(src, /price_cents/);
  assert.doesNotMatch(src, /amount_cents/);
  assert.doesNotMatch(src, /specialist_id/);
  assert.doesNotMatch(src, /LEAD_ENGINE_DIRECT_PPL_CHECKOUT_ENABLED/);
});

test("post-payment UX polls server state and never trusts redirect as entitlement", async () => {
  const src = await readFile(tablePath, "utf8");
  assert.match(src, /payment === "success"/);
  assert.match(src, /router\.refresh\(\)/);
  assert.match(src, /paymentPollCountRef\.current >= 10/);
  assert.match(src, /Контакты откроются только после подтверждения Stripe/);
  assert.doesNotMatch(src, /payment === "success"[\s\S]{0,300}contacts_unlocked: true/);
});
