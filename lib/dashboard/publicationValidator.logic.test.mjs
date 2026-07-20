import assert from "node:assert/strict";
import test from "node:test";
import {
  validatePublication,
  hasValidServiceForPublish,
} from "./publicationValidator.ts";
import { isPublicationReadyForDashboard } from "./publicationReadiness.ts";
import { isWithinDualRadius } from "../specialists/geography.ts";

const BONN = {
  name: "Anna",
  categoryId: "cat-child",
  categoryParentId: "cat-root",
  languages: ["de"],
  workFormat: "online",
  countryCode: "DE",
  postalCode: "53115",
  city: "Bonn",
  lat: 50.7374,
  lng: 7.0982,
  serviceRadiusKm: null,
  servicesInSelectedCategory: [{ title: "Consult", price_from: 50, is_active: true }],
};

test("online without location is blocked", () => {
  const r = validatePublication({
    ...BONN,
    postalCode: null,
    city: null,
    lat: null,
    lng: null,
  });
  assert.equal(r.ready, false);
  const codes = r.blocking.map((b) => b.code);
  assert.ok(codes.includes("postal_code_required"));
  assert.ok(codes.includes("city_required"));
  assert.ok(codes.includes("coordinates_required"));
  assert.ok(!codes.includes("service_radius_required"));
});

test("online with full location and no radius is ready", () => {
  const r = validatePublication(BONN);
  assert.equal(r.ready, true);
  assert.deepEqual(r.blocking, []);
});

test("offline with location but no radius is blocked", () => {
  const r = validatePublication({
    ...BONN,
    workFormat: "offline",
    serviceRadiusKm: null,
  });
  assert.equal(r.ready, false);
  assert.ok(r.blocking.some((b) => b.code === "service_radius_required"));
});

test("offline with full location and radius is ready", () => {
  const r = validatePublication({
    ...BONN,
    workFormat: "offline",
    serviceRadiusKm: 30,
  });
  assert.equal(r.ready, true);
});

test("hybrid with full location and radius is ready", () => {
  const r = validatePublication({
    ...BONN,
    workFormat: "hybrid",
    serviceRadiusKm: 50,
  });
  assert.equal(r.ready, true);
});

test("gallery missing is recommendation only", () => {
  const r = validatePublication({
    ...BONN,
    hasGallery: false,
    hasAbout: true,
    hasPhoto: true,
  });
  assert.equal(r.ready, true);
  assert.ok(r.recommendations.some((x) => x.code === "gallery_recommended"));
  assert.ok(!r.blocking.some((b) => String(b.code).includes("gallery")));
});

test("country not DE is blocked", () => {
  const r = validatePublication({ ...BONN, countryCode: "PL" });
  assert.equal(r.ready, false);
  assert.ok(r.blocking.some((b) => b.code === "country_not_supported"));
});

test("isPublicationReadyForDashboard matches validatePublication.ready", () => {
  const input = {
    ...BONN,
    workFormat: "hybrid",
    serviceRadiusKm: 10,
  };
  assert.equal(isPublicationReadyForDashboard(input), validatePublication(input).ready);
  const incomplete = { ...input, city: "" };
  assert.equal(
    isPublicationReadyForDashboard(incomplete),
    validatePublication(incomplete).ready
  );
  assert.equal(validatePublication(incomplete).ready, false);
});

test("blocking issue shape includes code, field, step", () => {
  const r = validatePublication({
    ...BONN,
    name: "",
    postalCode: "",
    city: "",
    lat: null,
    lng: null,
  });
  for (const issue of r.blocking) {
    assert.equal(typeof issue.code, "string");
    assert.equal(typeof issue.field, "string");
    assert.equal(typeof issue.step, "string");
  }
});

test("hybrid local match uses radius; online never local-matches", () => {
  assert.equal(
    isWithinDualRadius({
      workFormat: "online",
      distanceKm: 5,
      userSearchRadiusKm: 30,
      specialistServiceRadiusKm: 30,
    }),
    false
  );
  assert.equal(
    isWithinDualRadius({
      workFormat: "hybrid",
      distanceKm: 20,
      userSearchRadiusKm: 30,
      specialistServiceRadiusKm: 30,
    }),
    true
  );
  assert.equal(
    isWithinDualRadius({
      workFormat: "hybrid",
      distanceKm: 40,
      userSearchRadiusKm: 50,
      specialistServiceRadiusKm: 30,
    }),
    false
  );
  assert.equal(
    isWithinDualRadius({
      workFormat: "offline",
      distanceKm: 25,
      userSearchRadiusKm: 50,
      specialistServiceRadiusKm: 50,
    }),
    true
  );
});

test("hasValidServiceForPublish requires priced active service", () => {
  assert.equal(hasValidServiceForPublish([]), false);
  assert.equal(
    hasValidServiceForPublish([{ title: "X", price_from: 0, is_active: true }]),
    false
  );
  assert.equal(
    hasValidServiceForPublish([{ title: "X", price_from: 10, is_active: true }]),
    true
  );
});
