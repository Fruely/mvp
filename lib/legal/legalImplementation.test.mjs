import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const { getAgbDocument, getSpecialistRulesDocument } = await import(
  "../../content/legal/reviewDocuments.ts"
);
const { getDatenschutzDocument } = await import("../../content/legal/datenschutz.ts");
const { getPartnerAgreement } = await import("../../content/partners/agreementContent.ts");
const { PARTNER_AGREEMENT_VERSION } = await import("../../content/partners/agreementMeta.ts");
const { stripReviewMarkers } = await import("../../lib/legal/reviewMarkdown.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("review markdown files exist for core legal docs", () => {
  for (const slug of ["agb", "datenschutz", "specialist-rules", "partnerprogramm"]) {
    for (const lang of ["de", "ru", "ua"]) {
      const path = join(root, "docs/legal/final-review", `${slug}.${lang}.md`);
      assert.ok(existsSync(path), `${slug}.${lang}.md missing`);
    }
  }
});

test("public legal loaders return non-empty sections without review markers", () => {
  for (const lang of ["de", "ru", "ua"]) {
    for (const doc of [
      getAgbDocument(lang),
      getDatenschutzDocument(lang),
      getSpecialistRulesDocument(lang),
    ]) {
      assert.ok(doc.sections.length > 3, `${lang} doc too short`);
      const serialized = JSON.stringify(doc);
      assert.doesNotMatch(serialized, /legal-section:/);
      assert.doesNotMatch(serialized, /<!--/);
    }
  }
});

test("partner agreement loads v1.2 from review source", () => {
  assert.equal(PARTNER_AGREEMENT_VERSION, "1.2");
  const de = getPartnerAgreement("de");
  assert.equal(de.version, "1.2");
  assert.ok(de.blocks.some((b) => b.type === "h2" && b.text.includes("§")));
  const plain = de.blocks.map((b) => (b.type === "p" ? b.text : b.type === "h2" ? b.text : "")).join(" ");
  assert.doesNotMatch(plain, /partner_attributions|payout_id/i);
  assert.match(plain, /manuelle SEPA/i);
});

test("agb german grammar uses dauerhaften Datenträger", () => {
  const raw = readFileSync(join(root, "docs/legal/final-review/agb.de.md"), "utf8");
  assert.match(stripReviewMarkers(raw), /dauerhaften Datenträger/);
  assert.doesNotMatch(stripReviewMarkers(raw), /dauerhaftem Datenträger/);
});

test("legal routes referenced in app tree", () => {
  const agbPage = readFileSync(join(root, "app/[lang]/agb/page.tsx"), "utf8");
  assert.match(agbPage, /getAgbDocument/);
  const footer = readFileSync(join(root, "components/Footer.jsx"), "utf8");
  assert.match(footer, /\/agb/);
});

test("referral route gates cookie on consent cookie", () => {
  const route = readFileSync(join(root, "app/r/[code]/route.ts"), "utf8");
  assert.match(route, /hasReferralConsentFromCookie/);
  assert.match(route, /REFERRAL_INTENT_COOKIE/);
  assert.match(route, /encodeReferralIntentToken/);
});

test("register route persists agb and rules versions", () => {
  const route = readFileSync(join(root, "app/api/specialists/register/route.ts"), "utf8");
  assert.match(route, /terms_accepted_at/);
  assert.match(route, /terms_version/);
  assert.match(route, /b2b_declaration_required/);
  assert.match(route, /privacy_acknowledgement_required/);
});

test("application route validates full legal acceptance model", () => {
  const route = readFileSync(join(root, "app/api/specialists/application/route.ts"), "utf8");
  assert.match(route, /b2b_declaration_required/);
  assert.match(route, /agb_acceptance_required/);
  assert.match(route, /privacy_acknowledgement_required/);
  assert.match(route, /SPECIALIST_AGB_VERSION/);
  assert.match(route, /getSpecialistRulesVersion/);
});

test("referral consent cookie architecture", () => {
  const consentCookie = readFileSync(join(root, "lib/consent/consentCookie.ts"), "utf8");
  assert.match(consentCookie, /freuly_consent_v1/);
  assert.match(consentCookie, /referral/);
  assert.match(consentCookie, /sameSite:\s*"lax"/);

  const referralApi = readFileSync(join(root, "app/api/consent/referral-cookie/route.ts"), "utf8");
  assert.match(referralApi, /PARTNER_REF_COOKIE/);
  assert.match(referralApi, /REFERRAL_INTENT_COOKIE/);

  const cookie = readFileSync(join(root, "lib/partners/cookie.ts"), "utf8");
  assert.match(cookie, /PARTNER_REF_MAX_AGE_SEC = 90 \* 24 \* 60 \* 60/);

  const intent = readFileSync(join(root, "lib/partners/referralIntent.ts"), "utf8");
  assert.doesNotMatch(intent, /fingerprint|ipHash/i);
});

test("consent banner keeps analytics and removes external media category", () => {
  const banner = readFileSync(join(root, "components/consent/CookieConsentBanner.tsx"), "utf8");
  assert.match(banner, /referral/);
  assert.doesNotMatch(banner, /externalMedia/);
  assert.match(banner, /persistClientConsent|freuly_consent_v1/);
});

test("pricing locales avoid automatic renewal claims", () => {
  for (const lang of ["de", "ru", "ua"]) {
    const raw = readFileSync(join(root, `locales/${lang}.json`), "utf8");
    assert.doesNotMatch(raw, /automatisch verlängert|автоматически продлева|автоматично продовж/i);
    assert.match(raw, /29/);
    assert.match(raw, /59/);
  }
});
