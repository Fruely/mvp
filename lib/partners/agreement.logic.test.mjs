import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PARTNER_AGREEMENT_VERSION } from "./featureFlags.ts";
import { evaluateInvitationConsume } from "./invitationLogic.ts";

test("agreement version constant is stable non-empty string", () => {
  assert.equal(typeof PARTNER_AGREEMENT_VERSION, "string");
  assert.match(PARTNER_AGREEMENT_VERSION, /^20\d{2}/);
});

test("agreement accept API rejects client-supplied partner id pattern", () => {
  const src = readFileSync(
    new URL("../../app/api/partner/agreement/accept/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(src, /getPartnerForUser/);
  assert.doesNotMatch(src, /body\.partner_id/);
  assert.match(src, /agreement_version_mismatch/);
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
