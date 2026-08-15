import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_LANG, langFromCookie } from "./i18n.ts";

test("DEFAULT_LANG is ru", () => {
  assert.equal(DEFAULT_LANG, "ru");
});

test("langFromCookie respects valid cookie values", () => {
  assert.equal(langFromCookie("ua"), "ua");
  assert.equal(langFromCookie("de"), "de");
  assert.equal(langFromCookie("ru"), "ru");
});

test("langFromCookie falls back to ru for missing or invalid cookie", () => {
  assert.equal(langFromCookie(undefined), "ru");
  assert.equal(langFromCookie(null), "ru");
  assert.equal(langFromCookie(""), "ru");
  assert.equal(langFromCookie("fr"), "ru");
  assert.equal(langFromCookie("en"), "ru");
});
