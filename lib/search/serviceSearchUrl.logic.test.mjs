/**
 * Unit tests for the new service-search URL/radius helpers.
 * No DB / no React; pure URL logic (Phase 1: user search radius).
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SERVICE_SEARCH_RADIUS_KM,
  SERVICE_SEARCH_UI_RADII_KM,
  buildServiceSearchResultsUrl,
  isUiRadiusKm,
  normalizeUiRadiusKm,
  toSearchLang,
} from "./serviceSearchUrl.ts";
import {
  isAllowedServiceRadiusKm,
  PUBLIC_SERVICE_RADII_KM,
} from "../specialists/geography.ts";

function paramsOf(url) {
  return new URLSearchParams(url.split("?")[1] ?? "");
}

test("UI radii are exactly 10/30/50/100 and default is 30", () => {
  assert.deepEqual([...SERVICE_SEARCH_UI_RADII_KM], [10, 30, 50, 100]);
  assert.equal(DEFAULT_SERVICE_SEARCH_RADIUS_KM, 30);
});

test("UI radii stay in sync with geography PUBLIC_SERVICE_RADII_KM", () => {
  assert.deepEqual(
    [...SERVICE_SEARCH_UI_RADII_KM],
    [...PUBLIC_SERVICE_RADII_KM]
  );
});

test("toSearchLang maps ua → uk, keeps ru/de", () => {
  assert.equal(toSearchLang("ua"), "uk");
  assert.equal(toSearchLang("ru"), "ru");
  assert.equal(toSearchLang("de"), "de");
});

test("nearby + default radius 30", () => {
  const url = buildServiceSearchResultsUrl({
    service: "собрать шкаф",
    language: "ru",
    format: "nearby",
    location: "Siegen",
  });
  const p = paramsOf(url);
  assert.equal(p.get("lang"), "ru");
  assert.equal(p.get("q"), "собрать шкаф");
  assert.equal(p.get("place"), "Siegen");
  assert.equal(p.get("radius"), "30");
  assert.equal(p.get("mode"), null);
});

test("nearby + 10 / 50 / 100", () => {
  for (const km of [10, 50, 100]) {
    const url = buildServiceSearchResultsUrl({
      service: "psycholog",
      language: "de",
      format: "nearby",
      location: "Köln",
      radiusKm: km,
    });
    const p = paramsOf(url);
    assert.equal(p.get("radius"), String(km));
    assert.equal(p.get("place"), "Köln");
    assert.equal(p.get("lang"), "de");
  }
});

test("online has no radius / place", () => {
  const url = buildServiceSearchResultsUrl({
    service: "перевод документов",
    language: "ua",
    format: "online",
    location: "",
    radiusKm: 50,
  });
  const p = paramsOf(url);
  assert.equal(p.get("mode"), "online");
  assert.equal(p.get("radius"), null);
  assert.equal(p.get("place"), null);
  assert.equal(p.get("lang"), "uk");
});

test("any has no radius / place / mode", () => {
  const url = buildServiceSearchResultsUrl({
    service: "steuererklärung",
    language: "ru",
    format: "any",
    location: "Berlin",
    radiusKm: 100,
  });
  const p = paramsOf(url);
  assert.equal(p.get("mode"), null);
  assert.equal(p.get("place"), null);
  assert.equal(p.get("radius"), null);
  assert.equal(p.get("q"), "steuererklärung");
});

test("invalid radius falls back to default 30 for nearby", () => {
  for (const bad of [42, 0, -5, NaN, undefined, null, "30"]) {
    const url = buildServiceSearchResultsUrl({
      service: "x",
      language: "ru",
      format: "nearby",
      location: "Bonn",
      radiusKm: bad,
    });
    assert.equal(paramsOf(url).get("radius"), "30");
  }
});

test("nearby without location does not emit place/radius", () => {
  const url = buildServiceSearchResultsUrl({
    service: "x",
    language: "ru",
    format: "nearby",
    location: "   ",
    radiusKm: 50,
  });
  const p = paramsOf(url);
  assert.equal(p.get("place"), null);
  assert.equal(p.get("radius"), null);
});

test("isUiRadiusKm / normalizeUiRadiusKm", () => {
  assert.equal(isUiRadiusKm(30), true);
  assert.equal(isUiRadiusKm(100), true);
  assert.equal(isUiRadiusKm(42), false);
  assert.equal(normalizeUiRadiusKm(50), 50);
  assert.equal(normalizeUiRadiusKm(42), 30);
});

test("legacy 5/25 stay backend-valid but are NOT shown in the UI", () => {
  // Backend still accepts legacy radii (existing rows / old URLs).
  assert.equal(isAllowedServiceRadiusKm(5), true);
  assert.equal(isAllowedServiceRadiusKm(25), true);
  // New UI never offers them.
  assert.equal(isUiRadiusKm(5), false);
  assert.equal(isUiRadiusKm(25), false);
});
