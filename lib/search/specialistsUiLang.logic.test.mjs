import assert from "node:assert/strict";
import test from "node:test";
import {
  coerceSpecialistsUiLang,
  resolveSpecialistsUiLang,
} from "./specialistsUiLang.ts";

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

test("uk search-language code maps to ua UI, not default ru", () => {
  assert.equal(coerceSpecialistsUiLang("uk"), "ua");
  assert.equal(
    resolveSpecialistsUiLang({
      queryLang: "uk",
      cookieLang: "ru",
    }),
    "ua"
  );
});

test("explicit ui param wins over service-language lang=ru", () => {
  assert.equal(
    resolveSpecialistsUiLang({
      uiParam: "ua",
      queryLang: "ru",
      cookieLang: "ru",
    }),
    "ua"
  );
});

test("explicit ui=de wins over lang=uk", () => {
  assert.equal(
    resolveSpecialistsUiLang({
      uiParam: "de",
      queryLang: "uk",
    }),
    "de"
  );
});
