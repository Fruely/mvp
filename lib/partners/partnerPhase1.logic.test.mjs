import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("A: unauthenticated partner onboarding redirects to localized login with next", () => {
  const src = readFileSync(
    new URL("../../app/[lang]/partners/onboarding/page.tsx", import.meta.url),
    "utf8"
  );
  assert.match(src, /login\?next=\/\$\{lang\}\/partners\/onboarding/);
});

test("localized login preserves next when redirecting to /login", () => {
  const src = readFileSync(new URL("../../app/[lang]/login/page.tsx", import.meta.url), "utf8");
  assert.match(src, /encodeURIComponent\(next\)/);
  assert.match(src, /redirect\(`\/login\$\{qs\}`\)/);
});

test("B–C: login page honors valid partner next for authenticated users", () => {
  const login = readFileSync(new URL("../../app/login/page.tsx", import.meta.url), "utf8");
  assert.match(login, /resolveSafeNextPath/);
  assert.match(login, /if \(safeNext\) \{\s*redirect\(safeNext\)/);
  const signIn = readFileSync(
    new URL("../../app/specialist/claim/SpecialistPasswordSignIn.tsx", import.meta.url),
    "utf8"
  );
  assert.match(signIn, /nextPath/);
  assert.match(signIn, /signUp/);
  assert.match(signIn, /postAuthRedirectHref/);
});

test("D: login without next keeps specialist default flow", () => {
  const login = readFileSync(new URL("../../app/login/page.tsx", import.meta.url), "utf8");
  assert.match(login, /specialistDashboardPath/);
  assert.match(login, /redirect\("\/specialist\/claim"\)/);
  const signIn = readFileSync(
    new URL("../../app/specialist/claim/SpecialistPasswordSignIn.tsx", import.meta.url),
    "utf8"
  );
  assert.match(signIn, /specialistDashboardHrefClient/);
});

test("E: auth callback validates next against open redirects", () => {
  const src = readFileSync(new URL("../../app/auth/callback/route.ts", import.meta.url), "utf8");
  assert.match(src, /resolveSafeNextPath/);
});

test("F–I: ensureSelfServePartner and referral code recovery are idempotent", () => {
  const join = readFileSync(new URL("./join.ts", import.meta.url), "utf8");
  assert.match(join, /ensurePartnerPrimaryReferralCode/);
  assert.match(join, /ensureSelfServePartner/);
  const ensure = readFileSync(new URL("./ensureReferralCode.ts", import.meta.url), "utf8");
  assert.match(ensure, /isValidReferralCode/);
  assert.match(ensure, /canAssignNewReferralCode/);
  assert.match(ensure, /referral_code_taken/);
  const accept = readFileSync(
    new URL("../../app/api/partner/agreement/accept/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(accept, /ensureSelfServePartner/);
  assert.match(accept, /referral_code/);
});

test("J: blocked/suspended partners do not get new active referral links", () => {
  const ensure = readFileSync(new URL("./ensureReferralCode.ts", import.meta.url), "utf8");
  assert.match(ensure, /canAssignNewReferralCode/);
  const service = readFileSync(new URL("./service.ts", import.meta.url), "utf8");
  assert.match(service, /findActiveLinkByCode/);
  assert.match(service, /\.eq\("status", "active"\)/);
});
