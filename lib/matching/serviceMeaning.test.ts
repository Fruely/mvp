import assert from "node:assert/strict";
import test from "node:test";
import { normalizeServiceMeaning, serviceMeaningsCompatible } from "./serviceMeaning.ts";

test("the same offer and request phrase match after normalization", () => {
  assert.equal(normalizeServiceMeaning("  Замена   генератора! "), "замена генератора");
  assert.equal(serviceMeaningsCompatible("Замена генератора", "замена генератора"), true);
});

test("a contained phrase matches and an unrelated phrase does not", () => {
  assert.equal(
    serviceMeaningsCompatible("Замена генератора", "Нужна замена генератора в автомобиле"),
    true,
  );
  assert.equal(serviceMeaningsCompatible("Замена генератора", "Покраска стен"), false);
});

test("a short fragment does not match a different phrase", () => {
  assert.equal(serviceMeaningsCompatible("генератор", "Замена генератора"), false);
  assert.equal(serviceMeaningsCompatible("", "Замена генератора"), false);
});
