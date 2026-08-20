/**
 * MAIN specialist profile photo fit:
 * - no / unsafe metadata → contain (live production behavior)
 * - trusted focal metadata → cover + object-position
 * Unrelated image surfaces must keep their existing cover/contain behavior.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { registerPartnerTestHooks } from "../../lib/partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

const {
  SPECIALIST_MAIN_PHOTO_FIT_CLASS,
  SPECIALIST_PHOTO_FRAME_ASPECT,
  resolveLiveSpecialistPhotoFit,
  resolveSpecialistPhotoFit,
  specialistMainPhotoFitClass,
  visibleCoverWindow,
} = await import("./specialistMainPhotoFit.ts");

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSrc(relativePath) {
  return readFileSync(join(root, relativePath), "utf-8");
}

function usesResolver(src) {
  return /resolveLiveSpecialistPhotoFit\(/.test(src) && /specialistMainPhotoFitClass\(/.test(src);
}

const PORTRAIT_ASPECT = 3 / 4;
const CARD_ASPECT = SPECIALIST_PHOTO_FRAME_ASPECT.card;

const safePortraitFocus = {
  focalX: 0.5,
  focalY: 0.34,
  confidence: 0.92,
  source: "auto",
  face: { x: 0.35, y: 0.25, w: 0.3, h: 0.18 },
  subject: { x: 0.22, y: 0.12, w: 0.56, h: 0.82 },
};

test("shared MAIN photo fallback class is contain + center, not cover", () => {
  assert.equal(SPECIALIST_MAIN_PHOTO_FIT_CLASS, "object-contain object-center");
  assert.doesNotMatch(SPECIALIST_MAIN_PHOTO_FIT_CLASS, /object-cover/);
});

test("no metadata → contain on every public surface", () => {
  for (const surface of ["card", "thumb", "hero", "dashboard"]) {
    const fit = resolveSpecialistPhotoFit({ focus: null, surface, imageAspect: PORTRAIT_ASPECT });
    assert.equal(fit.fit, "contain");
    assert.equal(fit.objectPosition, "50% 50%");
    assert.equal(specialistMainPhotoFitClass(fit), SPECIALIST_MAIN_PHOTO_FIT_CLASS);
  }
});

test("undefined focus → contain", () => {
  const fit = resolveSpecialistPhotoFit({ surface: "card", imageAspect: PORTRAIT_ASPECT });
  assert.equal(fit.fit, "contain");
});

test("dashboard never covers, even with trusted metadata", () => {
  const fit = resolveSpecialistPhotoFit({
    focus: safePortraitFocus,
    surface: "dashboard",
    imageAspect: PORTRAIT_ASPECT,
  });
  assert.equal(fit.fit, "contain");
});

test("low confidence auto focus → contain", () => {
  const fit = resolveSpecialistPhotoFit({
    focus: { ...safePortraitFocus, confidence: 0.2 },
    surface: "card",
    imageAspect: PORTRAIT_ASPECT,
    frameAspect: CARD_ASPECT,
  });
  assert.equal(fit.fit, "contain");
});

test("hero requires higher confidence than cards", () => {
  const mid = { ...safePortraitFocus, confidence: 0.7 };
  const card = resolveSpecialistPhotoFit({
    focus: mid,
    surface: "card",
    imageAspect: PORTRAIT_ASPECT,
    frameAspect: CARD_ASPECT,
  });
  const hero = resolveSpecialistPhotoFit({
    focus: mid,
    surface: "hero",
    imageAspect: PORTRAIT_ASPECT,
  });
  assert.equal(card.fit, "cover");
  assert.equal(hero.fit, "contain");
});

test("trusted card focus keeps face+headroom → cover + object-position", () => {
  const fit = resolveSpecialistPhotoFit({
    focus: safePortraitFocus,
    surface: "card",
    imageAspect: PORTRAIT_ASPECT,
    frameAspect: CARD_ASPECT,
  });
  assert.equal(fit.fit, "cover");
  assert.equal(fit.objectPosition, "50% 34%");
  assert.equal(specialistMainPhotoFitClass(fit), "object-cover");
});

test("trusted thumb focus → cover", () => {
  const fit = resolveSpecialistPhotoFit({
    focus: safePortraitFocus,
    surface: "thumb",
    imageAspect: PORTRAIT_ASPECT,
    frameAspect: 1,
  });
  assert.equal(fit.fit, "cover");
});

test("missing imageAspect → contain even with trusted focus", () => {
  const fit = resolveSpecialistPhotoFit({
    focus: safePortraitFocus,
    surface: "card",
  });
  assert.equal(fit.fit, "contain");
});

test("focal point out of range → contain", () => {
  const fit = resolveSpecialistPhotoFit({
    focus: { ...safePortraitFocus, focalY: 1.4 },
    surface: "card",
    imageAspect: PORTRAIT_ASPECT,
    frameAspect: CARD_ASPECT,
  });
  assert.equal(fit.fit, "contain");
});

test("trusted confidence but no face/subject boxes → contain", () => {
  const fit = resolveSpecialistPhotoFit({
    focus: { focalX: 0.5, focalY: 0.3, confidence: 0.99 },
    surface: "card",
    imageAspect: PORTRAIT_ASPECT,
    frameAspect: CARD_ASPECT,
  });
  assert.equal(fit.fit, "contain");
});

test("face would be clipped by cover window → contain", () => {
  const fit = resolveSpecialistPhotoFit({
    focus: {
      focalX: 0.5,
      focalY: 0.8,
      confidence: 0.95,
      face: { x: 0.35, y: 0.02, w: 0.3, h: 0.22 },
    },
    surface: "card",
    imageAspect: PORTRAIT_ASPECT,
    frameAspect: CARD_ASPECT,
  });
  assert.equal(fit.fit, "contain");
});

test("manual source skips confidence gate but still refuses an unsafe crop", () => {
  const unsafe = resolveSpecialistPhotoFit({
    focus: {
      focalX: 0.5,
      focalY: 0.8,
      confidence: 0,
      source: "manual",
      face: { x: 0.35, y: 0.02, w: 0.3, h: 0.22 },
    },
    surface: "card",
    imageAspect: PORTRAIT_ASPECT,
    frameAspect: CARD_ASPECT,
  });
  assert.equal(unsafe.fit, "contain");

  const safe = resolveSpecialistPhotoFit({
    focus: { ...safePortraitFocus, confidence: 0, source: "manual" },
    surface: "card",
    imageAspect: PORTRAIT_ASPECT,
    frameAspect: CARD_ASPECT,
  });
  assert.equal(safe.fit, "cover");
});

test("large face ratio (tight selfie) → contain on every public surface", () => {
  const tightSelfie = {
    focalX: 0.5,
    focalY: 0.48,
    confidence: 0.9,
    source: "auto",
    face: { x: 0.25, y: 0.29, w: 0.48, h: 0.48 },
    subject: { x: 0.05, y: 0.12, w: 0.9, h: 0.85 },
  };
  for (const surface of ["card", "thumb", "hero"]) {
    const fit = resolveSpecialistPhotoFit({
      focus: tightSelfie,
      surface,
      imageAspect: 1,
    });
    assert.equal(fit.fit, "contain", surface);
  }
});

test("insufficient source headroom → contain on card and hero, thumb may still cover", () => {
  const hairNearTop = {
    focalX: 0.57,
    focalY: 0.36,
    confidence: 0.96,
    source: "auto",
    face: { x: 0.44, y: 0.251, w: 0.258, h: 0.258 },
    subject: { x: 0.02, y: 0.12, w: 0.94, h: 0.88 },
  };
  const card = resolveSpecialistPhotoFit({
    focus: hairNearTop,
    surface: "card",
    imageAspect: 0.85,
  });
  const hero = resolveSpecialistPhotoFit({
    focus: hairNearTop,
    surface: "hero",
    imageAspect: 0.85,
  });
  const thumb = resolveSpecialistPhotoFit({
    focus: hairNearTop,
    surface: "thumb",
    imageAspect: 0.85,
  });
  assert.equal(card.fit, "contain");
  assert.equal(hero.fit, "contain");
  assert.equal(thumb.fit, "cover");
});

test("hero rejects a mid-size headshot that thumb and card may still cover", () => {
  const midHeadshot = {
    focalX: 0.5,
    focalY: 0.45,
    confidence: 0.95,
    source: "auto",
    face: { x: 0.3, y: 0.38, w: 0.32, h: 0.32 },
    subject: { x: 0.1, y: 0.2, w: 0.7, h: 0.75 },
  };
  const card = resolveSpecialistPhotoFit({ focus: midHeadshot, surface: "card", imageAspect: 1 });
  const thumb = resolveSpecialistPhotoFit({ focus: midHeadshot, surface: "thumb", imageAspect: 1 });
  const hero = resolveSpecialistPhotoFit({ focus: midHeadshot, surface: "hero", imageAspect: 1 });
  assert.equal(card.fit, "cover");
  assert.equal(thumb.fit, "cover");
  assert.equal(hero.fit, "contain");
});

test("small face with ample headroom stays cover on card, thumb, and hero", () => {
  const ampleHeadroom = {
    focalX: 0.49,
    focalY: 0.44,
    confidence: 0.93,
    source: "auto",
    face: { x: 0.42, y: 0.38, w: 0.14, h: 0.14 },
    subject: { x: 0.28, y: 0.32, w: 0.44, h: 0.68 },
  };
  for (const surface of ["card", "thumb", "hero"]) {
    const fit = resolveSpecialistPhotoFit({
      focus: ampleHeadroom,
      surface,
      imageAspect: 1,
    });
    assert.equal(fit.fit, "cover", surface);
  }
});

test("person-only subject: top of subject must stay visible", () => {
  const fit = resolveSpecialistPhotoFit({
    focus: {
      focalX: 0.5,
      focalY: 0.226,
      confidence: 0.9,
      subject: { x: 0.2, y: 0.12, w: 0.6, h: 0.85 },
    },
    surface: "card",
    imageAspect: PORTRAIT_ASPECT,
    frameAspect: CARD_ASPECT,
  });
  assert.equal(fit.fit, "cover");
});

test("visibleCoverWindow crops vertically for portrait-in-landscape", () => {
  const window = visibleCoverWindow(PORTRAIT_ASPECT, CARD_ASPECT, 0.5, 0.34);
  assert.equal(window.w, 1);
  assert.ok(window.h < 1);
  assert.ok(window.y > 0);
});

test("live cover gate keeps public surfaces on contain even with trusted metadata", () => {
  for (const surface of ["card", "thumb", "hero"]) {
    const fit = resolveLiveSpecialistPhotoFit({
      focus: safePortraitFocus,
      surface,
      imageAspect: PORTRAIT_ASPECT,
      frameAspect: CARD_ASPECT,
    });
    assert.equal(fit.fit, "contain", surface);
  }
});

test("SpecialistHeroContent resolves fit (no hardcoded cover)", () => {
  const src = readSrc("components/specialist/SpecialistHeroContent.tsx");
  assert.equal(usesResolver(src), true);
  assert.match(src, /surface: "hero"/);
  assert.doesNotMatch(src, /className="object-cover"/);
});

test("SpecialistPreviewCard resolves fit as card", () => {
  const src = readSrc("components/specialist/SpecialistPreviewCard.tsx");
  assert.equal(usesResolver(src), true);
  assert.match(src, /surface: "card"/);
  assert.doesNotMatch(src, /className="object-cover"/);
});

test("SpecialistResultCard resolves fit as thumb", () => {
  const src = readSrc("components/public/SpecialistResultCard.tsx");
  assert.equal(usesResolver(src), true);
  assert.match(src, /surface: "thumb"/);
  assert.doesNotMatch(src, /className="object-cover"/);
});

test("VariantCSpecialistCard resolves fit as card", () => {
  const src = readSrc("components/home/variantC/VariantCSpecialistCard.tsx");
  assert.equal(usesResolver(src), true);
  assert.match(src, /surface: "card"/);
  assert.doesNotMatch(src, /className="object-cover"/);
});

test("SpecialistAvatarImage dashboard surface always uses resolver contain path", () => {
  const src = readSrc("components/specialist/SpecialistAvatarImage.tsx");
  assert.match(src, /resolveSpecialistPhotoFit\(/);
  assert.match(src, /surface: "dashboard"/);
  assert.doesNotMatch(src, /className="object-cover"/);
});

test("public MAIN photo callers pass view-model imageAspect into the live resolver", () => {
  for (const relative of [
    "components/specialist/SpecialistHeroContent.tsx",
    "components/specialist/SpecialistPreviewCard.tsx",
    "components/public/SpecialistResultCard.tsx",
    "components/home/variantC/VariantCSpecialistCard.tsx",
  ]) {
    const src = readSrc(relative);
    assert.match(src, /resolveLiveSpecialistPhotoFit\(/);
    assert.match(src, /imageAspect:\s*mainPhoto\.imageAspect/);
  }
});

test("hero and listing card frames keep existing geometry (no size change)", () => {
  const hero = readSrc("components/specialist/SpecialistHeroContent.tsx");
  assert.match(
    hero,
    /h-\[280px\] w-full shrink-0 overflow-hidden rounded-2xl bg-freuly-primary-light md:h-\[380px\] md:w-\[380px\]/,
  );

  const preview = readSrc("components/specialist/SpecialistPreviewCard.tsx");
  assert.match(preview, /relative h-\[200px\] overflow-hidden bg-freuly-page/);

  const result = readSrc("components/public/SpecialistResultCard.tsx");
  assert.match(
    result,
    /h-\[54px\] w-\[54px\] shrink-0 overflow-hidden rounded-freuly-md bg-freuly-page sm:h-24 sm:w-24/,
  );

  const variantC = readSrc("components/home/variantC/VariantCSpecialistCard.tsx");
  assert.match(
    variantC,
    /relative h-\[200px\] w-full overflow-hidden bg-freuly-border-subtle sm:h-\[220px\]/,
  );
});

test("negative: category images keep object-cover", () => {
  const src = readSrc("components/CategoryCard.jsx");
  assert.match(src, /className="object-cover"/);
  assert.doesNotMatch(src, /resolveSpecialistPhotoFit/);
});

test("negative: service images keep object-cover", () => {
  const src = readSrc("components/ServiceCard.jsx");
  assert.match(src, /className="object-cover"/);
  assert.doesNotMatch(src, /resolveSpecialistPhotoFit/);
});

test("negative: dashboard TopBar circular avatar keeps object-cover", () => {
  const src = readSrc("components/dashboard/TopBar.tsx");
  assert.match(src, /object-cover/);
  assert.doesNotMatch(src, /resolveSpecialistPhotoFit/);
});

test("negative: homepage trust-stack avatars keep object-cover", () => {
  const src = readSrc("app/[lang]/HomeClient.tsx");
  assert.match(src, /className="h-full w-full object-cover"/);
  assert.doesNotMatch(src, /resolveSpecialistPhotoFit/);
});

test("negative: public profile gallery thumbs keep object-cover", () => {
  const src = readSrc("components/specialist/SpecialistProfileClient.tsx");
  assert.match(src, /className="object-cover"/);
  assert.doesNotMatch(src, /resolveSpecialistPhotoFit/);
});
