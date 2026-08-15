import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const map = {
      "@/lib/partners/referralUrl": new URL("../partners/referralUrl.ts", import.meta.url).href,
    };
    if (map[specifier]) return { url: map[specifier], shortCircuit: true };
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !specifier.endsWith(".ts") &&
      !specifier.endsWith(".mjs")
    ) {
      return {
        url: new URL(`${specifier}.ts`, context.parentURL).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

const pageSrc = readFileSync(
  new URL("../../app/[lang]/request/[public_token]/page.tsx", import.meta.url),
  "utf8",
);
const registerSrc = readFileSync(
  new URL("../../app/api/specialists/register/route.ts", import.meta.url),
  "utf8",
);
const helperSrc = readFileSync(
  new URL("./tryBindPromotionAttributionFromCookie.ts", import.meta.url),
  "utf8",
);

const { ATTRIBUTION_SIGNUP_BIND_LOOKUP_SELECT } = await import("./attributionConstants.ts");

test("A: primary CTA links to canonical accept page", () => {
  assert.match(pageSrc, /buildPromotedAcceptUrl/);
  assert.match(pageSrc, /serviceRequestPromotion\.accept\.cta/);
});

test("B-C: accept CTA uses server-built path, not raw attribution tokens", () => {
  const ctaBlock = pageSrc.match(/<Link[\s\S]*?accept\.cta[\s\S]*?<\/Link>/)?.[0] ?? "";
  assert.ok(ctaBlock.length > 0);
  assert.doesNotMatch(ctaBlock, /attribution_token/);
  assert.match(ctaBlock, /acceptHref/);
});

test("D: RU/UA/DE signup CTA keys exist", () => {
  for (const file of ["ru.json", "ua.json", "de.json"]) {
    const json = JSON.parse(
      readFileSync(new URL(`../../locales/${file}`, import.meta.url), "utf8"),
    );
    assert.ok(json.serviceRequestPromotion?.signupCta?.title);
    assert.ok(json.serviceRequestPromotion?.signupCta?.body);
    assert.ok(json.serviceRequestPromotion?.signupCta?.button);
  }
});

test("K-L: helper never reads promotion_id or attribution_id from client body", () => {
  assert.doesNotMatch(helperSrc, /body\?\.promotion_id/);
  assert.doesNotMatch(helperSrc, /body\?\.attribution_id/);
  assert.doesNotMatch(registerSrc, /body\?\.promotion_id/);
  assert.doesNotMatch(registerSrc, /body\?\.attribution_id/);
});

test("Q-R: binding helper uses INSERT only, no UPDATE/UPSERT/DELETE", () => {
  assert.match(helperSrc, /\.insert\(/);
  assert.doesNotMatch(helperSrc, /\.update\(/);
  assert.doesNotMatch(helperSrc, /\.upsert\(/);
  assert.doesNotMatch(helperSrc, /\.delete\(/);
});

test("data access whitelist: narrow attribution select, no star, no service_requests join", () => {
  assert.equal(ATTRIBUTION_SIGNUP_BIND_LOOKUP_SELECT, "id, promotion_id");
  assert.doesNotMatch(helperSrc, /select\(\s*["']?\*["']?\s*\)/);
  assert.doesNotMatch(helperSrc, /service_requests/);
  assert.doesNotMatch(helperSrc, /client_name/);
  assert.doesNotMatch(helperSrc, /client_email/);
});

test("W: helper logs only sanitised status codes", () => {
  assert.match(helperSrc, /\[promotion\/signup-bind\]/);
  assert.doesNotMatch(helperSrc, /console\.(log|info|warn|error)\([^)]*token/);
  assert.doesNotMatch(helperSrc, /console\.(log|info|warn|error)\([^)]*userId/);
  assert.doesNotMatch(helperSrc, /console\.(log|info|warn|error)\([^)]*specialistId/);
});

test("X: register success payload unchanged and exposes no attribution token", () => {
  assert.match(registerSrc, /jsonNoStore\(\{\s*success:\s*true,\s*specialist\s*\}/);
  assert.doesNotMatch(registerSrc, /attribution_token/);
  assert.doesNotMatch(registerSrc, /freuly_request_attribution.*jsonNoStore/);
});

test("Y: existing partner attribution flow unchanged", () => {
  assert.match(registerSrc, /tryCreateAttributionFromCookie/);
  assert.match(registerSrc, /PARTNER_REF_COOKIE/);
  assert.match(registerSrc, /partner attribution skipped/);
});

test("Z: register request/response contract unchanged", () => {
  assert.match(registerSrc, /normalizeName\(body\?\.name\)/);
  assert.match(registerSrc, /normalizeEmail\(body\?\.email\)/);
  assert.match(registerSrc, /specialist_rules_accepted/);
  assert.match(registerSrc, /email_confirm:\s*true/);
  assert.match(registerSrc, /status:\s*201/);
});

test("AA: duplicate email behavior unchanged", () => {
  assert.match(registerSrc, /Специалист с таким email уже существует/);
  assert.match(registerSrc, /status:\s*409/);
});

test("AB: specialist profile creation unchanged", () => {
  assert.match(registerSrc, /specialist_profiles/);
  assert.match(registerSrc, /specialist profile init failed/);
});

test("register integration clears attribution cookie server-side on bind result", () => {
  assert.match(registerSrc, /tryBindPromotionAttributionFromCookie/);
  assert.match(registerSrc, /buildAttributionCookieClearOptions/);
  assert.match(registerSrc, /promotionBind\.clearCookie/);
});

test("helper is server-only and uses service_role server client", () => {
  assert.match(helperSrc, /"server-only"/);
  assert.match(helperSrc, /createSupabaseServerClient/);
});

test("CTA uses locale page lang, not query injection", () => {
  assert.match(pageSrc, /getPublishedPromotionPublicView/);
  assert.match(pageSrc, /view\.locale !== lang/);
});
