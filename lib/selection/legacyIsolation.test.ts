import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("legacy claim still finalizes and paid reservation does not emit client_selected_you", () => {
  const claimRoute = read("../../app/api/specialist/matches/[matchId]/claim/route.ts");
  const claim = read("./claimMatch.ts");
  const reserve = read("./reserveMatch.ts");
  const confirm = read("../billing/confirmServiceRequestConnection.ts");
  const fulfill = read("../billing/fulfillServiceRequestCapture.ts");
  const interest = read("./interest.ts");

  assert.match(claimRoute, /claimOwnMatch/);
  assert.doesNotMatch(claimRoute, /reserveServiceRequestMatch/);
  assert.match(claim, /export async function claimOwnMatch/);
  assert.match(claim, /return finalizeServiceRequestConnection/);
  assert.doesNotMatch(reserve, /client_selected_you/);
  assert.doesNotMatch(confirm, /client_selected_you/);
  assert.doesNotMatch(confirm, /finalizeServiceRequestConnection/);
  assert.doesNotMatch(fulfill, /client_selected_you/);
  assert.match(fulfill, /request_offer_access_grants/);
  assert.match(interest, /client_selected_you/);
  assert.match(interest, /connection_confirmation_required/);
});

test("paid service-request access does not inherit subscription or direct-lead pricing", () => {
  const fulfill = read("../billing/fulfillServiceRequestCapture.ts");
  const pricing = read("../leadEngine/serviceRequestAccessPricing.ts");
  const offers = read("../leadEngine/matchedServiceRequestOffer.ts");
  const matching = read("../matching/runMatching.ts");
  const shadow = read("../leadEngine/requestOfferPolicy.ts");

  for (const source of [fulfill, pricing, offers, matching]) {
    assert.equal(source.includes("lead_pricing_rules"), false);
    assert.equal(source.includes("plan_code"), false);
    assert.equal(source.includes("plan_status"), false);
  }
  assert.match(shadow, /billing_model: "subscription"/);
  assert.match(shadow, /price_cents: null/);
  assert.match(offers, /pay_per_lead/);
});

test("the budget parser lives in one module", () => {
  const pricing = read("../leadEngine/serviceRequestAccessPricing.ts");
  const parser = read("../serviceRequests/clientBudget.ts");
  assert.equal(pricing.includes("NUMBER_RE"), false);
  assert.match(pricing, /serviceRequests\/clientBudget/);
  assert.match(parser, /export function normalizeExplicitClientBudget/);
});

test("paid rollout stays blocked while legacy claim remains", () => {
  const sdd = read("../../docs/sdd/02-MATCH-OFFER-CLAIM.md");
  assert.match(sdd, /POST \/api\/specialist\/matches\/\{matchId\}\/claim/);
  assert.match(sdd, /Paid rollout blocker/);
  assert.match(sdd, /SERVICE_REQUEST_PAID_CLAIM_ENABLED/);
});
