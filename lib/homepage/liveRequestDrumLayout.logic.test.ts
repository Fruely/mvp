import assert from "node:assert/strict";
import test from "node:test";
import {
  circularDistance,
  drumCardAccent,
  drumCardTransform,
  drumSlotStyle,
} from "./liveRequestDrumLayout.ts";

test("circular distance wraps around a 4-card drum", () => {
  assert.equal(circularDistance(0, 0, 4), 0);
  assert.equal(circularDistance(1, 0, 4), 1);
  assert.equal(circularDistance(3, 0, 4), -1);
});

test("front slot is fully readable and receding slots are smaller and lighter", () => {
  const front = drumSlotStyle(0);
  const above = drumSlotStyle(-1);
  const below = drumSlotStyle(1);
  assert.ok(front && above && below);
  assert.equal(front.rotateX, 0);
  assert.equal(front.scale, 1);
  assert.equal(front.opacity, 1);
  assert.ok(above.y < 0 && below.y > 0);
  assert.ok(above.scale < front.scale && below.scale < front.scale);
  assert.ok(above.opacity < front.opacity && below.opacity < front.opacity);
  assert.ok(front.zIndex > above.zIndex && front.zIndex > below.zIndex);
  assert.match(drumCardTransform(front), /rotateX\(0deg\)/);
});

test("reduced motion keeps only the front card", () => {
  assert.deepEqual(drumSlotStyle(0, { reducedMotion: true })?.opacity, 1);
  assert.equal(drumSlotStyle(-1, { reducedMotion: true }), null);
  assert.equal(drumSlotStyle(1, { reducedMotion: true }), null);
});

test("drum uses a small editorial accent set, not a new palette", () => {
  assert.equal(drumCardAccent("taxes"), drumCardAccent("taxes"));
  assert.match(drumCardAccent("it"), /^#[0-9a-f]{6}$/i);
});
