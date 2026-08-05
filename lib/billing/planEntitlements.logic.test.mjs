import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  GALLERY_LIMIT_GROWTH,
  GALLERY_LIMIT_PROFESSIONAL,
  PLAN_MONTHLY_PRICE_EUR,
  PLAN_PUBLIC_NAMES,
  buildGalleryLimitError,
  canAddGalleryImage,
  canUpdateGalleryUrls,
  normalizeGalleryUrls,
  resolveGalleryLimitFromPlanCode,
  resolveSpecialistEntitlements,
  selectPublicGalleryUrls,
} from "./planEntitlements.ts";

test("A: basic gallery limit = 5", () => {
  assert.equal(resolveGalleryLimitFromPlanCode("basic"), GALLERY_LIMIT_PROFESSIONAL);
});

test("B: premium gallery limit = 15", () => {
  assert.equal(resolveGalleryLimitFromPlanCode("premium"), GALLERY_LIMIT_GROWTH);
});

test("C: unknown plan fallback = 5", () => {
  assert.equal(resolveGalleryLimitFromPlanCode("starter"), 5);
  assert.equal(resolveGalleryLimitFromPlanCode(null), 5);
});

test("D: founder/early_access without paid plan = 5", () => {
  const e = resolveSpecialistEntitlements({ plan_code: "starter", plan_status: "early_access" });
  assert.equal(e.galleryLimit, 5);
  assert.equal(e.effectivePaidPlan, null);
});

test("E: active premium = 15", () => {
  const e = resolveSpecialistEntitlements({ plan_code: "premium", plan_status: "active" });
  assert.equal(e.galleryLimit, 15);
  assert.equal(e.publicPlanName, PLAN_PUBLIC_NAMES.premium);
});

test("F: trialing basic = 5", () => {
  const e = resolveSpecialistEntitlements({ plan_code: "basic", plan_status: "trialing" });
  assert.equal(e.galleryLimit, 5);
});

test("G: sixth image blocked for professional", () => {
  assert.equal(canAddGalleryImage(5, 5), false);
});

test("H: sixth image allowed for growth", () => {
  assert.equal(canAddGalleryImage(5, 15), true);
});

test("I: fifteenth growth image allowed", () => {
  assert.equal(canAddGalleryImage(14, 15), true);
});

test("J: sixteenth growth image blocked", () => {
  assert.equal(canAddGalleryImage(15, 15), false);
});

test("K: avatar is separate — gallery count is url array only", () => {
  const urls = normalizeGalleryUrls(["a.jpg", "b.jpg"]);
  assert.equal(urls.length, 2);
});

test("L: delete frees slot", () => {
  const oldUrls = ["a", "b", "c", "d", "e"];
  const newUrls = ["a", "b", "c", "d"];
  assert.equal(canUpdateGalleryUrls(oldUrls, newUrls, 5), true);
  assert.equal(canAddGalleryImage(newUrls.length, 5), true);
});

test("M: public profile at most 5 for basic", () => {
  const urls = Array.from({ length: 12 }, (_, i) => `img-${i}.jpg`);
  assert.equal(selectPublicGalleryUrls(urls, 5).length, 5);
  assert.equal(selectPublicGalleryUrls(urls, 5)[0], "img-0.jpg");
});

test("N: public profile at most 15 for premium", () => {
  const urls = Array.from({ length: 20 }, (_, i) => `img-${i}.jpg`);
  assert.equal(selectPublicGalleryUrls(urls, 15).length, 15);
});

test("O: stable order preserved", () => {
  const urls = ["first", "second", "third"];
  assert.deepEqual(selectPublicGalleryUrls(urls, 2), ["first", "second"]);
});

test("P: downgrade does not require DB truncation on save", () => {
  const oldUrls = Array.from({ length: 15 }, (_, i) => `img-${i}.jpg`);
  assert.equal(canUpdateGalleryUrls(oldUrls, oldUrls, 5), true);
});

test("Q: downgrade cannot add while over limit", () => {
  const oldUrls = Array.from({ length: 15 }, (_, i) => `img-${i}.jpg`);
  const newUrls = [...oldUrls, "new.jpg"];
  assert.equal(canUpdateGalleryUrls(oldUrls, newUrls, 5), false);
});

test("R: downgrade public shows first 5", () => {
  const stored = Array.from({ length: 15 }, (_, i) => `img-${i}.jpg`);
  const publicUrls = selectPublicGalleryUrls(stored, 5);
  assert.deepEqual(publicUrls, stored.slice(0, 5));
});

test("S: re-upgrade allows up to 15 again", () => {
  const stored = Array.from({ length: 15 }, (_, i) => `img-${i}.jpg`);
  assert.equal(selectPublicGalleryUrls(stored, 15).length, 15);
});

test("T: gallery_limit_reached structured error", () => {
  const e = resolveSpecialistEntitlements({ plan_code: "basic", plan_status: "active" });
  const err = buildGalleryLimitError(e, 5);
  assert.equal(err.error, "gallery_limit_reached");
  assert.equal(err.limit, 5);
  assert.equal(err.currentCount, 5);
  assert.equal(err.plan, "basic");
});

test("U: display prices 29/59 EUR", () => {
  assert.equal(PLAN_MONTHLY_PRICE_EUR.basic, 29);
  assert.equal(PLAN_MONTHLY_PRICE_EUR.premium, 59);
});

test("V: upload route uses entitlement resolver", () => {
  const src = readFileSync(
    new URL("../../app/api/specialist/gallery/upload/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /resolveSpecialistEntitlements/);
  assert.match(src, /buildGalleryLimitError/);
});

test("W: save route enforces canUpdateGalleryUrls", () => {
  const src = readFileSync(
    new URL("../../app/api/specialist/dashboard/save/route.ts", import.meta.url),
    "utf8",
  );
  assert.match(src, /canUpdateGalleryUrls/);
});

test("X: public API selects public gallery urls", () => {
  const src = readFileSync(new URL("../../app/api/specialists/[id]/route.ts", import.meta.url), "utf8");
  assert.match(src, /selectPublicGalleryUrls/);
});
