import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PARTNER_AGREEMENT_VERSION } from "./featureFlags.ts";
import { evaluateInvitationConsume } from "./invitationLogic.ts";

test("agreement version is v1.0 and stays synced with agreementMeta", () => {
  assert.equal(PARTNER_AGREEMENT_VERSION, "1.0");
  const meta = readFileSync(
    new URL("../../content/partners/agreementMeta.ts", import.meta.url),
    "utf8"
  );
  assert.match(meta, /PARTNER_AGREEMENT_VERSION = "1\.0"/);
  assert.match(meta, /PARTNER_REWARD_VALIDATION_DAYS = 14/);
  assert.match(meta, /PARTNER_AGREEMENT_EFFECTIVE_DATE = "\d{4}-\d{2}-\d{2}"/);
  const validation = readFileSync(
    new URL("./commissionValidation.ts", import.meta.url),
    "utf8"
  );
  assert.match(validation, /COMMISSION_VALIDATION_DAYS = 14/);
});

test("German agreement source has required sections and provider", () => {
  const src = readFileSync(
    new URL("../../content/partners/agreementContent.ts", import.meta.url),
    "utf8"
  );
  const meta = readFileSync(
    new URL("../../content/partners/agreementMeta.ts", import.meta.url),
    "utf8"
  );
  assert.match(src, /Partnerprogramm-Bedingungen von Freuly/);
  assert.match(src, /§ 1 Anbieter und Geltungsbereich/);
  assert.match(src, /§ 21 Schlussbestimmungen/);
  assert.match(src, /providerLines\("de"\)/);
  assert.match(meta, /Natalia Sheshenia/);
  assert.match(meta, /Sheshenia – Freuly/);
  assert.match(meta, /freuly\.de@gmail\.com/);
  assert.match(meta, /Hofolper Straße 46/);
});

test("RU/UA agreement source includes governing note and key rules", () => {
  const src = readFileSync(
    new URL("../../content/partners/agreementContent.ts", import.meta.url),
    "utf8"
  );
  assert.match(src, /юридически определяющей является немецкая версия/);
  assert.match(src, /юридично визначальною є німецька версія/);
  assert.match(src, /self-referral/);
  assert.match(src, /14/);
});

test("agreement accept API rejects client-supplied partner id pattern", () => {
  const src = readFileSync(
    new URL("../../app/api/partner/agreement/accept/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(src, /getPartnerForUser/);
  assert.match(src, /ensureSelfServePartner/);
  assert.doesNotMatch(src, /body\.partner_id/);
  assert.match(src, /agreement_version_mismatch/);
  assert.match(src, /agreement_locale/);
  assert.match(src, /household_rules_accepted/);
});

test("invite token cannot be reused after used_at", () => {
  const r = evaluateInvitationConsume({
    invitation: {
      used_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      email: "a@example.com",
    },
    partner: { user_id: null },
    userId: "user-1",
    userEmail: "a@example.com",
  });
  assert.equal(r.ok, false);
});

test("expired invite is rejected", () => {
  const r = evaluateInvitationConsume({
    invitation: {
      used_at: null,
      expires_at: new Date(Date.now() - 1000).toISOString(),
      email: "a@example.com",
    },
    partner: { user_id: null },
    userId: "user-1",
    userEmail: "a@example.com",
  });
  assert.equal(r.ok, false);
});

test("invite route and partners landing exist", () => {
  const invite = readFileSync(
    new URL("../../app/[lang]/partners/invite/[token]/page.tsx", import.meta.url),
    "utf8"
  );
  assert.match(invite, /PartnerClaimClient/);
  assert.match(invite, /initialToken/);

  const header = readFileSync(new URL("../../components/Header.tsx", import.meta.url), "utf8");
  assert.match(header, /\/partners/);
  assert.match(header, /header\.nav\.partners/);
});

test("PARTNER_PAYOUTS_ENABLED remains opt-in", () => {
  const flags = readFileSync(new URL("./featureFlags.ts", import.meta.url), "utf8");
  assert.match(flags, /PARTNER_PAYOUTS_ENABLED === "true"/);
  assert.doesNotMatch(flags, /PARTNER_PAYOUTS_ENABLED === "false"/);
});
