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

const { generateAttributionToken, isAttributionTokenUrlSafe, attributionTokenEntropyBits } =
  await import("./attributionToken.ts");
const {
  sanitizeUtmFields,
  sanitizeUtmValue,
  parseReferrerHost,
  buildCaptureQueryString,
} = await import("./attributionSanitize.ts");
const {
  ATTRIBUTION_COOKIE_NAME,
  buildAttributionCookieOptions,
} = await import("./attributionCookie.ts");
const {
  ATTRIBUTION_COOKIE_MAX_AGE_SEC,
  ATTRIBUTION_ROW_SELECT,
  ATTRIBUTION_UTM_KEYS,
} = await import("./attributionConstants.ts");
const { PROMOTION_PUBLIC_SELECT } = await import("./promotionConstants.ts");

test("A-C: attribution token is server-generated, URL-safe, 128-bit", () => {
  const token = generateAttributionToken();
  assert.ok(isAttributionTokenUrlSafe(token));
  assert.equal(attributionTokenEntropyBits(), 128);
  assert.doesNotMatch(token, /[+/=]/);
});

test("D-G: cookie is httpOnly, sameSite lax, secure in production, 30 days", () => {
  const cookieSrc = readFileSync(new URL("./attributionCookie.ts", import.meta.url), "utf8");
  assert.match(cookieSrc, /httpOnly:\s*true/);
  assert.match(cookieSrc, /sameSite:\s*"lax"/);
  assert.match(cookieSrc, /process\.env\.NODE_ENV === "production"/);
  assert.match(cookieSrc, /maxAge:\s*ATTRIBUTION_COOKIE_MAX_AGE_SEC/);
  assert.equal(ATTRIBUTION_COOKIE_MAX_AGE_SEC, 60 * 60 * 24 * 30);
  assert.equal(ATTRIBUTION_COOKIE_NAME, "freuly_request_attribution");
  const options = buildAttributionCookieOptions();
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
});

test("H: no localStorage/sessionStorage in attribution client capture", () => {
  const src = readFileSync(
    new URL("../../components/serviceRequests/PromotionAttributionCaptureBeacon.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(src, /localStorage/);
  assert.doesNotMatch(src, /sessionStorage/);
});

test("I-N: UTM whitelist, trim, bounds, control chars, ignore utm_term and arbitrary params", () => {
  const sanitized = sanitizeUtmFields({
    utm_source: "  telegram  ",
    utm_medium: "social",
    utm_campaign: "x".repeat(250),
    utm_content: "a\u0007b",
    utm_term: "ignored-term",
    email: "secret@example.com",
  });
  assert.equal(sanitized.utm_source, "telegram");
  assert.equal(sanitized.utm_medium, "social");
  assert.equal(sanitized.utm_campaign?.length, 200);
  assert.equal(sanitized.utm_content, "ab");
  assert.equal(sanitizeUtmValue("   ", 100), null);

  const query = buildCaptureQueryString("ru", "abcToken1234567890", {
    utm_source: "telegram",
    utm_term: "ignored",
    email: "secret@example.com",
  });
  assert.match(query, /utm_source=telegram/);
  assert.doesNotMatch(query, /utm_term/);
  assert.doesNotMatch(query, /email/);
  assert.deepEqual(ATTRIBUTION_UTM_KEYS, [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
  ]);
});

test("O-P: referrer stores hostname only and invalid referrer is null", () => {
  assert.equal(parseReferrerHost("https://t.me/path?x=1#frag"), "t.me");
  assert.equal(parseReferrerHost("https://User:Pass@Example.com:443/a"), "example.com");
  assert.equal(parseReferrerHost("not-a-url"), null);
  assert.equal(parseReferrerHost(null), null);
});

test("AB: public query still avoids select star and capture select keeps whitelist", () => {
  assert.doesNotMatch(PROMOTION_PUBLIC_SELECT, /\*/);
  assert.doesNotMatch(ATTRIBUTION_ROW_SELECT, /\*/);
  assert.doesNotMatch(PROMOTION_PUBLIC_SELECT, /client_name/);
  assert.doesNotMatch(ATTRIBUTION_ROW_SELECT, /client_email/);
});

test("AC: no attribution token in page HTML/props/beacon/API JSON", () => {
  const pageSrc = readFileSync(
    new URL("../../app/[lang]/request/[public_token]/page.tsx", import.meta.url),
    "utf8",
  );
  const beaconSrc = readFileSync(
    new URL("../../components/serviceRequests/PromotionAttributionCaptureBeacon.tsx", import.meta.url),
    "utf8",
  );
  const routeSrc = readFileSync(
    new URL("../../app/api/request-attribution/capture/route.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(pageSrc, /attribution_token/);
  assert.doesNotMatch(beaconSrc, /attributionToken/);
  assert.doesNotMatch(routeSrc, /NextResponse\.json/);
  assert.match(routeSrc, /status:\s*204/);
});

test("AD: attribution data uses service_role server client only", () => {
  const src = readFileSync(new URL("./promotionAttributionData.ts", import.meta.url), "utf8");
  assert.match(src, /createSupabaseServerClient/);
  assert.doesNotMatch(src, /createSupabaseServerComponentClient/);
});

test("attribution logs do not print tokens", () => {
  for (const file of [
    "./promotionAttributionData.ts",
    "./capturePromotionAttribution.ts",
    "../../app/api/request-attribution/capture/route.ts",
  ]) {
    const src = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.doesNotMatch(src, /console\.(log|info|debug)\([^)]*attribution_token/);
  }
});

test("Z: page renders even when attribution helper catches errors", () => {
  const pageSrc = readFileSync(
    new URL("../../app/[lang]/request/[public_token]/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(pageSrc, /tryRecordPromotionRepeatVisit/);
  assert.match(pageSrc, /catch/);
  assert.match(pageSrc, /promotion\.public_title/);
});

test("public page order validates promotion before capture", () => {
  const pageSrc = readFileSync(
    new URL("../../app/[lang]/request/[public_token]/page.tsx", import.meta.url),
    "utf8",
  );
  const promotionBlock = pageSrc.slice(pageSrc.indexOf("getPublishedPromotionForCapture"));
  const notFoundIdx = promotionBlock.indexOf("notFound();");
  const captureIdx = promotionBlock.indexOf("tryRecordPromotionRepeatVisit");
  assert.ok(notFoundIdx >= 0);
  assert.ok(captureIdx > notFoundIdx);
});
