import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildStarMapSummary,
  clusterStarMapPoints,
  dotSizeForCount,
  GERMANY_STAR_MAP_BOUNDS,
  GERMANY_STAR_MAP_VIEWBOX,
  projectLatLngToPercent,
  projectLatLngToViewBox,
  svgDotRadiusForCount,
  toPublicStarMapSummary,
} from "./starMapLogic.mjs";

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

test("projected cities keep plausible geographic order in the 500 viewBox", () => {
  const hamburg = projectLatLngToViewBox(53.55, 9.99, GERMANY_STAR_MAP_BOUNDS);
  const berlin = projectLatLngToViewBox(52.52, 13.4, GERMANY_STAR_MAP_BOUNDS);
  const cologne = projectLatLngToViewBox(50.94, 6.96, GERMANY_STAR_MAP_BOUNDS);
  const dusseldorf = projectLatLngToViewBox(51.23, 6.78, GERMANY_STAR_MAP_BOUNDS);
  const frankfurt = projectLatLngToViewBox(50.11, 8.68, GERMANY_STAR_MAP_BOUNDS);
  const munich = projectLatLngToViewBox(48.14, 11.58, GERMANY_STAR_MAP_BOUNDS);
  const kirchhundem = projectLatLngToViewBox(51.08, 8.1, GERMANY_STAR_MAP_BOUNDS);

  for (const point of [hamburg, berlin, cologne, dusseldorf, frankfurt, munich, kirchhundem]) {
    assert.ok(point.x > 20 && point.x < GERMANY_STAR_MAP_VIEWBOX.width - 20);
    assert.ok(point.y > 10 && point.y < GERMANY_STAR_MAP_VIEWBOX.height - 10);
  }

  assert.ok(hamburg.y < berlin.y);
  assert.ok(berlin.y < munich.y);
  assert.ok(cologne.x < frankfurt.x);
  assert.ok(frankfurt.x < berlin.x);
  assert.ok(dusseldorf.x < kirchhundem.x);
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
