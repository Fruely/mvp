import assert from "node:assert/strict";
import test from "node:test";
import { resolveSpecialistsUiLang } from "./specialistsUiLang.ts";

test("query lang wins over stale cookie and header", () => {
  assert.equal(
    resolveSpecialistsUiLang({
      queryLang: "ru",
      headerLang: "de",
      cookieLang: "de",
    }),
    "ru"
  );
});

test("header lang wins over cookie when query is absent", () => {
  assert.equal(
    resolveSpecialistsUiLang({
      queryLang: null,
      headerLang: "de",
      cookieLang: "ua",
    }),
    "de"
  );
});

test("falls back to ru when no valid lang is provided", () => {
  assert.equal(resolveSpecialistsUiLang({ queryLang: "en", cookieLang: "fr" }), "ru");
});
