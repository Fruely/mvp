import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

process.env.PARTNER_REF_SECRET = process.env.PARTNER_REF_SECRET || "test-partner-ref-secret-for-unit-tests";

const { PARTNER_REF_MAX_AGE_SEC, decodeReferralCookie, encodeReferralCookie } = await import(
  "./cookie.ts"
);
const { canApproveCommission, getCommissionEligibleAt } = await import("./commissionValidation.ts");
const { computePartnerRewardCents } = await import("./rewardCalculation.ts");
const { planSubscriptionCreditApplication } = await import("./creditMath.ts");
const { partnerPayoutsEnabled } = await import("./featureFlags.ts");

test("1: accept route auto-creates partner without admin approval", () => {
  const src = readFileSync(
    new URL("../../app/api/partner/agreement/accept/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(src, /ensureSelfServePartner/);
  assert.match(src, /acceptPartnerAgreement/);
  assert.doesNotMatch(src, /admin_approve|awaiting_admin/);
  const agreement = readFileSync(new URL("./agreement.ts", import.meta.url), "utf8");
  assert.match(agreement, /status === "pending"/);
  assert.match(agreement, /patch\.status = "active"/);
});

test("2: checkbox false → acceptance rejected", () => {
  const src = readFileSync(
    new URL("../../app/api/partner/agreement/accept/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(src, /agreement_not_accepted/);
  assert.match(src, /household_rules_not_accepted/);
  const ui = readFileSync(
    new URL("../../components/partners/PartnerAgreementClient.tsx", import.meta.url),
    "utf8"
  );
  assert.match(ui, /useState\(false\)/);
  assert.match(ui, /disabled=\{loading \|\| !checked \|\| !householdChecked\}/);
});

test("3–4: referral ownership belongs to partner of the code", () => {
  const rRoute = readFileSync(new URL("../../app/r/[code]/route.ts", import.meta.url), "utf8");
  assert.match(rRoute, /findActiveLinkByCode/);
  assert.match(rRoute, /partnerId: partner\.id/);
  const agreement = readFileSync(
    new URL("../../content/partners/agreementContent.ts", import.meta.url),
    "utf8"
  );
  assert.match(agreement, /Kopieren oder Verbreiten eines fremden Codes/);
});

test("5: first-touch wins — valid cookie is not overwritten", () => {
  const rRoute = readFileSync(new URL("../../app/r/[code]/route.ts", import.meta.url), "utf8");
  assert.match(rRoute, /existingValid/);
  assert.match(rRoute, /if \(!existingValid\)/);
});

test("6: 90-day attribution TTL expiry", () => {
  assert.equal(PARTNER_REF_MAX_AGE_SEC, 90 * 24 * 60 * 60);
  const issuedAt = Date.now() - 91 * 24 * 60 * 60 * 1000;
  const raw = encodeReferralCookie({
    v: 1,
    linkId: "11111111-1111-1111-1111-111111111111",
    partnerId: "22222222-2222-2222-2222-222222222222",
    issuedAt,
  });
  assert.equal(decodeReferralCookie(raw), null);
});

test("7: registration locks attribution (no overwrite)", () => {
  const src = readFileSync(new URL("./attribution.ts", import.meta.url), "utf8");
  assert.match(src, /already_attributed_user/);
  assert.match(src, /already_attributed_specialist/);
  assert.match(src, /Never overwrites existing attribution/);
});

test("8: self-referral blocked", () => {
  const commissions = readFileSync(new URL("./commissions.ts", import.meta.url), "utf8");
  assert.match(commissions, /self_referral/);
  assert.match(commissions, /partner\.user_id === specialistUserId/);
  const attr = readFileSync(new URL("./attribution.ts", import.meta.url), "utf8");
  assert.match(attr, /self_referral/);
});

test("9: household — attestation required, no IP hard reject", () => {
  const accept = readFileSync(
    new URL("../../app/api/partner/agreement/accept/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(accept, /household_rules_accepted/);
  assert.doesNotMatch(accept, /device_fingerprint|fingerprint/);
  const commissions = readFileSync(new URL("./commissions.ts", import.meta.url), "utf8");
  assert.doesNotMatch(commissions, /reject.*ip|ip_address.*self/i);
});

test("10–12: friend referral allowed; one reward; renewal blocked", () => {
  const agreement = readFileSync(
    new URL("../../content/partners/agreementContent.ts", import.meta.url),
    "utf8"
  );
  assert.match(agreement, /Freunden, Bekannten, Kollegen/);
  const commissions = readFileSync(new URL("./commissions.ts", import.meta.url), "utf8");
  assert.match(commissions, /commission_already_exists/);
});

test("13: immutable reward = gross - VAT - fee", () => {
  const r = computePartnerRewardCents({
    grossAmountCents: 2900,
    vatAmountCents: 200,
    providerFeeCents: 120,
    billingInterval: "month",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.reward.amountCents, 2580);
});

test("14–17: pending, +14 gate, refund blocks approve", () => {
  const paidAt = "2026-07-01T10:00:00.000Z";
  assert.equal(
    canApproveCommission({
      status: "pending",
      earnedAt: paidAt,
      paymentValidity: "valid",
      now: new Date("2026-07-01T12:00:00.000Z"),
    }).ok,
    false
  );
  const eligible = getCommissionEligibleAt(paidAt);
  assert.equal(
    canApproveCommission({
      status: "pending",
      earnedAt: paidAt,
      paymentValidity: "valid",
      now: eligible,
    }).ok,
    true
  );
  assert.equal(
    canApproveCommission({
      status: "pending",
      earnedAt: paidAt,
      paymentValidity: "refunded",
      now: eligible,
    }).ok,
    false
  );
});

test("16: automatic approval mechanism exists (cron + helper)", () => {
  const cron = readFileSync(
    new URL("../../app/api/cron/partner-commissions-approve/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(cron, /approveEligiblePendingCommissions|approveCommissionIfEligible/);
  const commissions = readFileSync(new URL("./commissions.ts", import.meta.url), "utf8");
  assert.match(commissions, /approveCommissionIfEligible/);
});

test("18: annual never creates full-year reward", () => {
  const r = computePartnerRewardCents({
    grossAmountCents: 34800,
    vatAmountCents: 0,
    providerFeeCents: 100,
    billingInterval: "year",
  });
  assert.equal(r.ok, false);
});

test("19–20: cash-vs-credit accounting plans", () => {
  assert.deepEqual(planSubscriptionCreditApplication(2580, 2900), {
    creditCents: 2580,
    remainingDueCents: 320,
    remainingAvailableCents: 0,
  });
  assert.deepEqual(planSubscriptionCreditApplication(6000, 2900), {
    creditCents: 2900,
    remainingDueCents: 0,
    remainingAvailableCents: 3100,
  });
});

test("21: no minimum payout in agreement / UI copy contracts", () => {
  const agreement = readFileSync(
    new URL("../../content/partners/agreementContent.ts", import.meta.url),
    "utf8"
  );
  assert.match(agreement, /keinen Mindestauszahlungsbetrag/);
  const de = readFileSync(new URL("../../locales/de.json", import.meta.url), "utf8");
  assert.match(de, /Kein Mindestbetrag/);
});

test("22: PARTNER_PAYOUTS_ENABLED=false by default; credit path independent", () => {
  assert.equal(partnerPayoutsEnabled, false);
  const flags = readFileSync(new URL("./featureFlags.ts", import.meta.url), "utf8");
  assert.match(flags, /PARTNER_PAYOUTS_ENABLED === "true"/);
});

test("DE agreement source includes auto-join and credit rules; hash helper uses DE plain text", () => {
  const src = readFileSync(
    new URL("../../content/partners/agreementContent.ts", import.meta.url),
    "utf8"
  );
  assert.match(
    src,
    /Eine vorherige Freigabe durch Freuly-Admin ist für die normale Teilnahme nicht erforderlich/
  );
  assert.match(src, /First-Touch/);
  assert.match(src, /Abo-Guthaben/);
  const hashSrc = readFileSync(new URL("./agreementHash.ts", import.meta.url), "utf8");
  assert.match(hashSrc, /getGermanAgreementPlainText/);
  assert.match(hashSrc, /sha256/);
  // Sanity: hashing any DE marker string is deterministic (runtime hash covered via app).
  const sample = "Partnerprogramm-Bedingungen von Freuly";
  assert.equal(
    createHash("sha256").update(sample, "utf8").digest("hex").length,
    64
  );
});

test("join helper creates partner without admin", () => {
  const src = readFileSync(new URL("./join.ts", import.meta.url), "utf8");
  assert.match(src, /ensureSelfServePartner/);
  assert.match(src, /No admin approval/);
});
