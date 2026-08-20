import assert from "node:assert/strict";
import test from "node:test";
import { registerPartnerTestHooks } from "../partners/partnerTestHooks.mjs";

registerPartnerTestHooks();

const {
  SPECIALIST_PHOTO_COVER_ENV,
  SPECIALIST_PHOTO_COVER_SURFACES,
  isSpecialistPhotoCoverEnabled,
} = await import("./photoFocusGate.ts");

test("card surface is prepared; live cover stays off without env", () => {
  const env = {};
  for (const surface of ["card", "thumb", "hero", "dashboard"]) {
    assert.equal(isSpecialistPhotoCoverEnabled(surface, { env }), false, surface);
  }
  assert.equal(SPECIALIST_PHOTO_COVER_SURFACES.card, true);
  assert.equal(SPECIALIST_PHOTO_COVER_SURFACES.thumb, false);
  assert.equal(SPECIALIST_PHOTO_COVER_SURFACES.hero, false);
  assert.equal(SPECIALIST_PHOTO_COVER_SURFACES.dashboard, false);
});

test("env true enables card only", () => {
  const env = { [SPECIALIST_PHOTO_COVER_ENV]: "true" };
  assert.equal(isSpecialistPhotoCoverEnabled("card", { env }), true);
  assert.equal(isSpecialistPhotoCoverEnabled("thumb", { env }), false);
  assert.equal(isSpecialistPhotoCoverEnabled("hero", { env }), false);
  assert.equal(isSpecialistPhotoCoverEnabled("dashboard", { env }), false);
});

test("card can enable later without enabling hero", () => {
  const env = { [SPECIALIST_PHOTO_COVER_ENV]: "true" };
  const surfaces = { card: true, thumb: false, hero: false, dashboard: false };
  assert.equal(isSpecialistPhotoCoverEnabled("card", { env, surfaces }), true);
  assert.equal(isSpecialistPhotoCoverEnabled("thumb", { env, surfaces }), false);
  assert.equal(isSpecialistPhotoCoverEnabled("hero", { env, surfaces }), false);
});

test("dashboard never covers even if a surface flag is mistakenly true", () => {
  const env = { [SPECIALIST_PHOTO_COVER_ENV]: "true" };
  const surfaces = { card: true, thumb: true, hero: true, dashboard: true };
  assert.equal(isSpecialistPhotoCoverEnabled("dashboard", { env, surfaces }), false);
});

test("unset env is an instant rollback even if surfaces are true", () => {
  const surfaces = { card: true, thumb: true, hero: true, dashboard: false };
  assert.equal(isSpecialistPhotoCoverEnabled("card", { env: {}, surfaces }), false);
  assert.equal(
    isSpecialistPhotoCoverEnabled("card", { env: { [SPECIALIST_PHOTO_COVER_ENV]: "1" }, surfaces }),
    false,
  );
});

test("live process.env literal enables card when no env override is passed", () => {
  const previous = process.env[SPECIALIST_PHOTO_COVER_ENV];
  delete process.env[SPECIALIST_PHOTO_COVER_ENV];
  try {
    assert.equal(isSpecialistPhotoCoverEnabled("card"), false);
    process.env.NEXT_PUBLIC_SPECIALIST_PHOTO_COVER_ENABLED = "true";
    assert.equal(isSpecialistPhotoCoverEnabled("card"), true);
    assert.equal(isSpecialistPhotoCoverEnabled("thumb"), false);
    assert.equal(isSpecialistPhotoCoverEnabled("hero"), false);
  } finally {
    if (previous === undefined) {
      delete process.env[SPECIALIST_PHOTO_COVER_ENV];
    } else {
      process.env[SPECIALIST_PHOTO_COVER_ENV] = previous;
    }
  }
});
