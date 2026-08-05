import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    const map = {
      "@/lib/partners/referralUrl": new URL("../partners/referralUrl.ts", import.meta.url).href,
    };
    if (map[specifier]) return { url: map[specifier], shortCircuit: true };
    if (specifier === "./constants" && context.parentURL?.includes("validation.ts")) {
      return { url: new URL("./constants.ts", import.meta.url).href, shortCircuit: true };
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

const { generatePromotionPublicToken, isPromotionTokenUrlSafe, promotionTokenEntropyBits } =
  await import("./promotionToken.ts");
const { validatePromotionDraftInput, isPublishedPromotionVisible } = await import(
  "./promotionValidation.ts"
);
const { PROMOTION_PUBLIC_SELECT } = await import("./promotionConstants.ts");
const { buildPublicPromotionUrl } = await import("./promotionUrl.ts");

const validDraft = {
  locale: "ru",
  public_title: "Нужна помощь с бухгалтерией",
  public_summary: "Ищем специалиста для ведения бухгалтерии малого бизнеса в Берлине.",
};

test("A: token is server-generated and URL-safe", () => {
  const token = generatePromotionPublicToken();
  assert.ok(isPromotionTokenUrlSafe(token));
  assert.doesNotMatch(token, /[+/=]/);
});

test("B: token has sufficient entropy and length", () => {
  assert.equal(promotionTokenEntropyBits(), 128);
  const token = generatePromotionPublicToken();
  assert.ok(token.length >= 16);
});

test("C: client cannot supply token or status", () => {
  assert.ok("error" in validatePromotionDraftInput({ ...validDraft, public_token: "evil" }));
  assert.ok("error" in validatePromotionDraftInput({ ...validDraft, status: "published" }));
});

test("R: public select is explicit whitelist, not star", () => {
  assert.notEqual(PROMOTION_PUBLIC_SELECT.trim(), "*");
  assert.doesNotMatch(PROMOTION_PUBLIC_SELECT, /\*/);
  assert.doesNotMatch(PROMOTION_PUBLIC_SELECT, /client_name/);
  assert.doesNotMatch(PROMOTION_PUBLIC_SELECT, /description/);
});

test("K-M: visibility rules for draft/closed/published", () => {
  assert.equal(
    isPublishedPromotionVisible({
      status: "published",
      published_at: "2026-08-05T10:00:00.000Z",
      closed_at: null,
    }),
    true,
  );
  assert.equal(
    isPublishedPromotionVisible({
      status: "draft",
      published_at: null,
      closed_at: null,
    }),
    false,
  );
  assert.equal(
    isPublishedPromotionVisible({
      status: "closed",
      published_at: "2026-08-05T10:00:00.000Z",
      closed_at: "2026-08-05T12:00:00.000Z",
    }),
    false,
  );
  assert.equal(
    isPublishedPromotionVisible({
      status: "published",
      published_at: null,
      closed_at: null,
    }),
    false,
  );
});

test("O-Q: public read model excludes PII and raw description fields", () => {
  const publicDataSrc = readFileSync(new URL("./promotionPublicData.ts", import.meta.url), "utf8");
  assert.match(publicDataSrc, /PROMOTION_PUBLIC_SELECT/);
  assert.doesNotMatch(publicDataSrc, /select\(\s*["']?\*["']?\s*\)/);
  assert.doesNotMatch(publicDataSrc, /service_requests/);
  assert.doesNotMatch(publicDataSrc, /client_name/);
  assert.doesNotMatch(publicDataSrc, /client_email/);
  assert.doesNotMatch(publicDataSrc, /client_phone/);
  assert.doesNotMatch(publicDataSrc, /description/);
});

test("S: promotion admin data uses assertAdminSession", () => {
  const src = readFileSync(new URL("./promotionAdminData.ts", import.meta.url), "utf8");
  assert.match(src, /assertAdminSession/);
  assert.match(src, /generatePromotionPublicToken/);
  assert.doesNotMatch(src, /console\.log\([^)]*public_token/);
});

test("admin promotion actions are server-only", () => {
  const src = readFileSync(
    new URL("../../app/admin/(protected)/service-requests/promotionActions.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /"use server"/);
  assert.match(src, /savePromotionDraftAdmin/);
  assert.match(src, /publishPromotionAdmin/);
  assert.match(src, /closePromotionAdmin/);
});

test("U: public page has noindex/nofollow and token not in title", () => {
  const src = readFileSync(
    new URL("../../app/[lang]/request/[public_token]/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  const metaBlock = src.match(/export async function generateMetadata[\s\S]*?^}/m)?.[0] ?? "";
  assert.doesNotMatch(metaBlock, /params\.public_token/);
});

test("V: sitemap does not include promotion route", () => {
  const src = readFileSync(new URL("../../app/sitemap.ts", import.meta.url), "utf8");
  assert.doesNotMatch(src, /\/request\//);
  assert.doesNotMatch(src, /service_request_promotions/);
});

test("public URL uses canonical APP_URL pattern", () => {
  const prev = process.env.APP_URL;
  process.env.APP_URL = "https://freuly.de";
  assert.equal(
    buildPublicPromotionUrl("ru", "abc123token"),
    "https://freuly.de/ru/request/abc123token",
  );
  process.env.APP_URL = prev;
});

test("admin block does not auto-fill summary from description", () => {
  const src = readFileSync(
    new URL(
      "../../app/admin/(protected)/service-requests/ServiceRequestPromotionBlock.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(src, /detail\.description/);
  assert.doesNotMatch(src, /client_name/);
  assert.doesNotMatch(src, /client_email/);
  assert.doesNotMatch(src, /client_phone/);
  assert.match(src, /public_summary: initialPromotion\?\.public_summary \?\? ""/);
});

function readClientFiles(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, name.name);
    if (name.isDirectory()) readClientFiles(full, acc);
    else if (/\.(tsx|ts|jsx|js)$/.test(name.name)) acc.push(full);
  }
  return acc;
}

test("T: promotion admin client files contain no admin secret", () => {
  const adminDir = fileURLToPath(
    new URL("../../app/admin/(protected)/service-requests/", import.meta.url),
  );
  const files = readClientFiles(adminDir);
  const forbidden = [
    /ADMIN_API_TOKEN/,
    /x-admin-token/i,
    /localStorage/,
    /sessionStorage/,
    /NEXT_PUBLIC.*ADMIN/i,
    /process\.env\.ADMIN/,
  ];
  for (const file of files) {
    const src = readFileSync(file, "utf8");
    if (!src.includes('"use client"')) continue;
    for (const pattern of forbidden) {
      assert.doesNotMatch(src, pattern, `${file} must not contain ${pattern}`);
    }
  }
});

test("Y: RU/UA/DE promotion locale keys exist", () => {
  for (const file of ["ru.json", "ua.json", "de.json"]) {
    const json = JSON.parse(
      readFileSync(new URL(`../../locales/${file}`, import.meta.url), "utf8"),
    );
    assert.ok(json.serviceRequestPromotion?.pageTitle);
    assert.ok(json.serviceRequestPromotion?.specialistCta);
    assert.ok(json.serviceRequestPromotion?.notFound);
    assert.ok(json.serviceRequestPromotion?.admin?.publish);
    assert.ok(json.serviceRequestPromotion?.admin?.copyLink);
  }
});
