import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildStarMapSummary,
  clusterStarMapPoints,
  GERMANY_STAR_MAP_BOUNDS,
  GERMANY_STAR_MAP_VIEWBOX,
  projectLatLngToPercent,
  projectLatLngToViewBox,
  svgDotRadiusForCount,
  toPublicStarMapSummary,
} from "./starMapLogic.mjs";
import {
  containPointInSilhouette,
  isPointSafelyInsideSilhouette,
} from "./containMarkerInSilhouette.mjs";

test("buildStarMapSummary aggregates by city with privacy-rounded centroids", () => {
  const summary = buildStarMapSummary(
    [
      {
        lat: 52.520008,
        lng: 13.404954,
        city: "Berlin",
        postalCode: "10115",
        mapTimestamp: "2026-08-10T10:00:00.000Z",
      },
      {
        lat: 52.517037,
        lng: 13.38886,
        city: "Berlin",
        postalCode: "10117",
        mapTimestamp: "2025-01-01T10:00:00.000Z",
      },
      {
        lat: 48.137154,
        lng: 11.576124,
        city: "München",
        postalCode: "80331",
        mapTimestamp: "2026-08-12T10:00:00.000Z",
      },
    ],
    [],
    new Date("2026-08-14T12:00:00.000Z"),
  );

  assert.equal(summary.eligibleCount, 3);
  assert.equal(summary.total, 3);
  assert.equal(summary.representedCount, 3);
  assert.equal(summary.missingCoordinatesCount, 0);
  assert.equal(summary.cities.length, 2);

  const berlin = summary.cities.find((city) => city.city === "Berlin");
  assert.ok(berlin);
  assert.equal(berlin.count, 2);
  assert.equal(berlin.recentCount, 1);
  assert.equal(berlin.lat, 52.52);
  assert.equal(berlin.lng, 13.4);
});

test("buildStarMapSummary uses postal_codes fallback without live geocoding", () => {
  const summary = buildStarMapSummary(
    [
      {
        lat: null,
        lng: null,
        city: null,
        postalCode: "80331",
        mapTimestamp: "2026-08-13T10:00:00.000Z",
      },
    ],
    [
      {
        postal_code: "80331",
        lat: 48.137,
        lng: 11.576,
        city: "München",
      },
    ],
    new Date("2026-08-14T12:00:00.000Z"),
  );

  assert.equal(summary.total, 1);
  assert.equal(summary.cities[0]?.city, "München");
  assert.equal(summary.missingCoordinatesCount, 0);
});

test("buildStarMapSummary uses postal code locality when profile city is missing", () => {
  const summary = buildStarMapSummary(
    [
      {
        lat: 50.8815369,
        lng: 6.9836788,
        city: null,
        postalCode: "50667",
        mapTimestamp: null,
      },
    ],
    [],
  );

  assert.equal(summary.total, 1);
  assert.equal(summary.cities[0]?.city, "PLZ 50667");
});

test("buildStarMapSummary excludes rows missing city and coordinates", () => {
  const summary = buildStarMapSummary(
    [
      {
        lat: 50.11,
        lng: 8.68,
        city: null,
        postalCode: null,
        mapTimestamp: null,
      },
    ],
    [],
  );

  assert.equal(summary.eligibleCount, 1);
  assert.equal(summary.total, 0);
  assert.equal(summary.missingCoordinatesCount, 1);
  assert.deepEqual(summary.cities, []);
});

test("toPublicStarMapSummary never injects fake fallback totals", () => {
  const summary = toPublicStarMapSummary({
    total: 0,
    cities: [],
    eligibleCount: 2,
    representedCount: 0,
    missingCoordinatesCount: 2,
  });

  assert.equal(summary.total, 0);
  assert.equal(summary.cities.length, 0);
});

test("projectLatLngToPercent maps Germany bounds to percentage space", () => {
  const berlin = projectLatLngToPercent(52.52, 13.4, GERMANY_STAR_MAP_BOUNDS);
  assert.ok(berlin.x > 50);
  assert.ok(berlin.y > 20 && berlin.y < 50);

  const munich = projectLatLngToPercent(48.14, 11.58, GERMANY_STAR_MAP_BOUNDS);
  assert.ok(munich.y > berlin.y);
});

test("svgDotRadiusForCount stays small in the 500 viewBox", () => {
  assert.equal(svgDotRadiusForCount(1), 3);
  assert.equal(svgDotRadiusForCount(4), 4);
  assert.equal(svgDotRadiusForCount(12), 5);
  assert.ok(svgDotRadiusForCount(99) <= 5);
});

function projectInsideSilhouette(lat, lng) {
  const raw = projectLatLngToViewBox(lat, lng, GERMANY_STAR_MAP_BOUNDS);
  return containPointInSilhouette(raw.x, raw.y);
}

const PRODUCTION_STAR_MAP_CITIES = [
  { city: "Kirchhundem", lat: 51.08, lng: 8.1 },
  { city: "Berlin", lat: 52.5, lng: 13.39 },
  { city: "Bonn", lat: 50.73, lng: 7.09 },
  { city: "Köln", lat: 50.92, lng: 6.96 },
  { city: "Krefeld", lat: 51.33, lng: 6.58 },
  { city: "Wuppertal", lat: 51.26, lng: 7.18 },
  { city: "Aalen", lat: 48.82, lng: 10.08 },
  { city: "Anzing", lat: 48.15, lng: 11.84 },
  { city: "Augsburg", lat: 48.38, lng: 10.9 },
  { city: "Bönnigheim", lat: 49.03, lng: 9.09 },
  { city: "Bremen", lat: 53.1, lng: 8.86 },
  { city: "Düsseldorf", lat: 51.21, lng: 6.83 },
  { city: "Essen", lat: 51.43, lng: 7.07 },
  { city: "Frankfurt am Main", lat: 50.11, lng: 8.68 },
  { city: "Hamburg", lat: 53.57, lng: 9.88 },
  { city: "Hünfelden", lat: 50.32, lng: 8.15 },
  { city: "Kassel", lat: 51.3, lng: 9.48 },
  { city: "Kirhhundem", lat: 51.06, lng: 8.12 },
  { city: "Landsberg am Lech", lat: 48.03, lng: 10.86 },
  { city: "Liedolsheim", lat: 49.17, lng: 8.42 },
  { city: "Münster", lat: 52.01, lng: 7.6 },
  { city: "Overath", lat: 50.94, lng: 7.29 },
  { city: "Paderborn", lat: 51.72, lng: 8.83 },
  { city: "Recklinghausen", lat: 51.62, lng: 7.19 },
  { city: "Schulzendorf", lat: 52.36, lng: 13.6 },
  { city: "Stuttgart", lat: 48.85, lng: 9.15 },
  { city: "Wetzlar", lat: 50.57, lng: 8.48 },
  { city: "Wolfsegg", lat: 49.1, lng: 11.98 },
];

test("projected cities keep plausible geographic order in the 500 viewBox", () => {
  const hamburg = projectInsideSilhouette(53.55, 9.99);
  const berlin = projectInsideSilhouette(52.52, 13.4);
  const cologne = projectInsideSilhouette(50.94, 6.96);
  const dusseldorf = projectInsideSilhouette(51.23, 6.78);
  const frankfurt = projectInsideSilhouette(50.11, 8.68);
  const munich = projectInsideSilhouette(48.14, 11.58);
  const kirchhundem = projectInsideSilhouette(51.08, 8.1);

  for (const point of [hamburg, berlin, cologne, dusseldorf, frankfurt, munich, kirchhundem]) {
    assert.ok(point.x > 20 && point.x < GERMANY_STAR_MAP_VIEWBOX.width - 20);
    assert.ok(point.y > 10 && point.y < GERMANY_STAR_MAP_VIEWBOX.height - 10);
    assert.equal(isPointSafelyInsideSilhouette(point.x, point.y), true);
  }

  assert.ok(hamburg.y < berlin.y);
  assert.ok(berlin.y < munich.y);
  assert.ok(cologne.x < frankfurt.x);
  assert.ok(frankfurt.x < berlin.x);
  assert.ok(dusseldorf.x < kirchhundem.x);
});

test("containPointInSilhouette snaps outside points inward without city-specific offsets", () => {
  const outside = containPointInSilhouette(10, 10);
  assert.equal(isPointSafelyInsideSilhouette(outside.x, outside.y), true);

  const berlin = projectLatLngToViewBox(52.5, 13.39, GERMANY_STAR_MAP_BOUNDS);
  const contained = containPointInSilhouette(berlin.x, berlin.y);
  assert.ok(Math.hypot(contained.x - berlin.x, contained.y - berlin.y) < 80);
});

test("every current production star-map city renders inside the silhouette", () => {
  for (const city of PRODUCTION_STAR_MAP_CITIES) {
    const point = projectInsideSilhouette(city.lat, city.lng);
    assert.equal(
      isPointSafelyInsideSilhouette(point.x, point.y),
      true,
      `${city.city} should stay inside the silhouette`,
    );
  }
});

test("containment keeps production city geographic order", () => {
  const byName = Object.fromEntries(
    PRODUCTION_STAR_MAP_CITIES.map((city) => [city.city, projectInsideSilhouette(city.lat, city.lng)]),
  );
  const munich = projectInsideSilhouette(48.14, 11.58);

  assert.ok(byName.Hamburg.y < byName.Berlin.y);
  assert.ok(byName.Berlin.y < munich.y);
  assert.ok(byName.Bremen.y < byName["Frankfurt am Main"].y);
  assert.ok(byName.Hamburg.y < byName["Frankfurt am Main"].y);
  assert.ok(byName.Köln.x < byName["Frankfurt am Main"].x);
  assert.ok(byName["Frankfurt am Main"].x < byName.Berlin.x);
  assert.ok(byName.Düsseldorf.x < byName.Kirchhundem.x);
  assert.ok(byName.Köln.x < byName.Berlin.x);
  assert.ok(munich.y > byName.Stuttgart.y);
});

test("silhouette containment has no per-city hardcoded offsets", () => {
  const source = readFileSync(new URL("./containMarkerInSilhouette.mjs", import.meta.url), "utf8");
  for (const city of PRODUCTION_STAR_MAP_CITIES) {
    assert.equal(source.includes(`"${city.city}"`), false);
    assert.equal(source.includes(`'${city.city}'`), false);
  }
  assert.equal(/CITY_OFFSET|cityOffsets|HARDCODE/.test(source), false);
});

test("clusterStarMapPoints combines dense nearby cities", () => {
  const cities = Array.from({ length: 6 }).map((_, index) => ({
    city: `City ${index + 1}`,
    lat: 52.5 + index * 0.002,
    lng: 13.4 + index * 0.002,
    count: 1,
    recentCount: 0,
  }));

  const renderables = clusterStarMapPoints(cities, {
    bounds: GERMANY_STAR_MAP_BOUNDS,
    mapWidthPx: 520,
    mapHeightPx: 520,
    radiusPx: 30,
    minPoints: 5,
  });

  assert.equal(renderables.length, 1);
  assert.equal(renderables[0]?.kind, "cluster");
  if (renderables[0]?.kind === "cluster") {
    assert.equal(renderables[0].count, 6);
  }
});

test("clusterStarMapPoints keeps sparse cities as individual markers", () => {
  const renderables = clusterStarMapPoints(
    [
      {
        city: "Berlin",
        lat: 52.52,
        lng: 13.4,
        count: 3,
        recentCount: 1,
      },
      {
        city: "Hamburg",
        lat: 53.55,
        lng: 9.99,
        count: 2,
        recentCount: 0,
      },
    ],
    {
      bounds: GERMANY_STAR_MAP_BOUNDS,
      mapWidthPx: 520,
      mapHeightPx: 520,
    },
  );

  assert.equal(renderables.length, 2);
  assert.ok(renderables.every((item) => item.kind === "point"));
});

test("star-map CSS animations must not use transform (overrides SVG translate)", () => {
  const css = readFileSync(new URL("../../styles/globals.css", import.meta.url), "utf8");
  const pulseBlock = css.slice(css.indexOf("@keyframes star-map-pulse"), css.indexOf(".star-map-pulse"));
  const enterBlock = css.slice(css.indexOf("@keyframes star-map-enter"), css.indexOf(".star-map-marker-enter"));
  assert.equal(pulseBlock.includes("transform"), false);
  assert.equal(enterBlock.includes("transform"), false);
});
