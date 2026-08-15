import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const map = {
      "server-only": new URL("../serviceRequests/testMocks/server-only.mjs", import.meta.url).href,
      "@/lib/supabase/server": new URL(
        "../billing/testMocks/billing-service-server.mjs",
        import.meta.url,
      ).href,
    };
    if (map[specifier]) return { url: map[specifier], shortCircuit: true };
    if (specifier.startsWith("@/")) {
      return {
        url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
        shortCircuit: true,
      };
    }
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

const publicViewSrc = readFileSync(
  new URL("./promotionPublicView.ts", import.meta.url),
  "utf8",
);
const publicPageSrc = readFileSync(
  new URL("../../app/[lang]/request/[public_token]/page.tsx", import.meta.url),
  "utf8",
);
const acceptPageSrc = readFileSync(
  new URL("../../app/[lang]/request/[public_token]/accept/page.tsx", import.meta.url),
  "utf8",
);
const promotionUrlSrc = readFileSync(new URL("./promotionUrl.ts", import.meta.url), "utf8");
const ruLocale = readFileSync(new URL("../../locales/ru.json", import.meta.url), "utf8");
const uaLocale = readFileSync(new URL("../../locales/ua.json", import.meta.url), "utf8");
const deLocale = readFileSync(new URL("../../locales/de.json", import.meta.url), "utf8");

const {
  buildPromotedAcceptUrl,
  buildPromotedPublicUrl,
  PROMOTION_SAFE_REQUEST_SELECT,
} = await import("./promotionPublicView.ts");
const { buildPublicPromotionAcceptUrl, requestPromotionAcceptPath } = await import(
  "./promotionUrl.ts"
);

test("safe select excludes PII fields", () => {
  assert.doesNotMatch(PROMOTION_SAFE_REQUEST_SELECT, /client_name/);
  assert.doesNotMatch(PROMOTION_SAFE_REQUEST_SELECT, /client_email/);
  assert.doesNotMatch(PROMOTION_SAFE_REQUEST_SELECT, /client_phone/);
  assert.doesNotMatch(PROMOTION_SAFE_REQUEST_SELECT, /description/);
  assert.match(PROMOTION_SAFE_REQUEST_SELECT, /service_timing_type/);
});

test("canonical accept URL pattern", () => {
  assert.equal(buildPromotedAcceptUrl("ru", "abc123"), "/ru/request/abc123/accept");
  assert.match(buildPublicPromotionAcceptUrl("ua", "tok"), /\/ua\/request\/tok\/accept$/);
  assert.equal(requestPromotionAcceptPath("de", "x"), "/de/request/x/accept");
});

test("public preview page uses safe view and accept CTA only for promoted", () => {
  assert.match(publicPageSrc, /getPublishedPromotionPublicView/);
  assert.match(publicPageSrc, /buildPromotedAcceptUrl/);
  assert.match(publicPageSrc, /serviceRequestPromotion\.accept\.cta/);
  assert.doesNotMatch(publicPageSrc, /client_name/);
  assert.doesNotMatch(publicPageSrc, /client_email/);
});

test("accept page metadata blocks indexing", () => {
  assert.match(acceptPageSrc, /robots: \{ index: false, follow: false \}/);
  assert.doesNotMatch(acceptPageSrc, /client_phone/);
});

test("accept CTA translations RU / UA / DE", () => {
  const ru = JSON.parse(ruLocale);
  const ua = JSON.parse(uaLocale);
  const de = JSON.parse(deLocale);
  assert.equal(ru.serviceRequestPromotion.accept.cta, "Принять заявку");
  assert.equal(ua.serviceRequestPromotion.accept.cta, "Прийняти заявку");
  assert.equal(de.serviceRequestPromotion.accept.cta, "Anfrage annehmen");
});

test("public page shows timing from safe view", () => {
  assert.match(publicPageSrc, /view\.when_label/);
  assert.match(publicViewSrc, /formatServiceTimingDisplay/);
});

test("accept URL is separate from preview URL", () => {
  assert.match(promotionUrlSrc, /buildPublicPromotionAcceptUrl/);
  assert.notEqual(
    buildPromotedPublicUrl("ru", "tok"),
    buildPromotedAcceptUrl("ru", "tok"),
  );
});
