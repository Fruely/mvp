import assert from "node:assert/strict";
import test from "node:test";
import {
  ALLOWED_SERVICE_RADII_KM,
  areValidCoordinates,
  getPublicSpecialistLocation,
  isAllowedServiceRadiusKm,
  isWithinDualRadius,
  normalizePostalCode,
  parseServiceRadiusKm,
  saveTouchesGeography,
  validatePublicationGeography,
} from "./geography.ts";
const BONN = {
  workFormat: "offline",
  countryCode: "DE",
  postalCode: "53115",
  city: "Bonn",
  lat: 50.7374,
  lng: 7.0982,
  serviceRadiusKm: 25,
};

test("normalizePostalCode accepts 53115", () => {
  assert.equal(normalizePostalCode("53115"), "53115");
  assert.equal(normalizePostalCode(" 53115 "), "53115");
  assert.equal(normalizePostalCode("5311"), null);
});

test("Bonn coords valid for DE", () => {
  assert.equal(areValidCoordinates(BONN.lat, BONN.lng, { countryCode: "DE" }), true);
  assert.equal(areValidCoordinates(0, 0, { countryCode: "DE" }), false);
  assert.equal(areValidCoordinates(40.7, -74.0, { countryCode: "DE" }), false);
});

test("offline full geo publishes", () => {
  assert.deepEqual(validatePublicationGeography(BONN), { ok: true });
});

test("hybrid full geo publishes", () => {
  assert.deepEqual(
    validatePublicationGeography({ ...BONN, workFormat: "hybrid" }),
    { ok: true }
  );
});

test("online full geo without radius publishes", () => {
  assert.deepEqual(
    validatePublicationGeography({
      ...BONN,
      workFormat: "online",
      serviceRadiusKm: null,
    }),
    { ok: true }
  );
});

test("offline without PLZ rejected", () => {
  const r = validatePublicationGeography({ ...BONN, postalCode: null });
  assert.equal(r.ok, false);
  assert.equal(r.code, "publication_postal_code_required");
});

test("offline without city rejected", () => {
  const r = validatePublicationGeography({ ...BONN, city: null });
  assert.equal(r.ok, false);
  assert.equal(r.code, "publication_city_required");
});

test("offline without coordinates rejected", () => {
  const r = validatePublicationGeography({ ...BONN, lat: null, lng: null });
  assert.equal(r.ok, false);
  assert.equal(r.code, "publication_coordinates_required");
});

test("offline without radius rejected", () => {
  const r = validatePublicationGeography({ ...BONN, serviceRadiusKm: null });
  assert.equal(r.ok, false);
  assert.equal(r.code, "publication_service_radius_required");
});

test("hybrid without radius rejected", () => {
  const r = validatePublicationGeography({
    ...BONN,
    workFormat: "hybrid",
    serviceRadiusKm: null,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, "publication_service_radius_required");
});

test("online without country rejected", () => {
  const r = validatePublicationGeography({
    ...BONN,
    workFormat: "online",
    countryCode: null,
    serviceRadiusKm: null,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, "publication_country_required");
});

test("online without city rejected", () => {
  const r = validatePublicationGeography({
    ...BONN,
    workFormat: "online",
    city: "",
    serviceRadiusKm: null,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, "publication_city_required");
});

test("online without coords rejected", () => {
  const r = validatePublicationGeography({
    ...BONN,
    workFormat: "online",
    lat: null,
    lng: null,
    serviceRadiusKm: null,
  });
  assert.equal(r.ok, false);
  assert.equal(r.code, "publication_coordinates_required");
});

test("unsupported country rejected", () => {
  const r = validatePublicationGeography({ ...BONN, countryCode: "PL" });
  assert.equal(r.ok, false);
  assert.equal(r.code, "publication_country_not_supported");
});

test("allowed radii 5/10/25/50/100", () => {
  for (const km of ALLOWED_SERVICE_RADII_KM) {
    assert.equal(isAllowedServiceRadiusKm(km), true);
  }
});

test("reject invalid radii", () => {
  for (const bad of [0, -1, 30, 200, 1000, NaN, Infinity, "25", null]) {
    assert.equal(isAllowedServiceRadiusKm(bad), false);
  }
  assert.equal(parseServiceRadiusKm("25"), 25);
  assert.equal(parseServiceRadiusKm("abc"), null);
});

test("dual radius: inside both", () => {
  assert.equal(
    isWithinDualRadius({
      workFormat: "offline",
      distanceKm: 8,
      userSearchRadiusKm: 10,
      specialistServiceRadiusKm: 25,
    }),
    true
  );
});

test("dual radius: outside user radius", () => {
  assert.equal(
    isWithinDualRadius({
      workFormat: "offline",
      distanceKm: 12,
      userSearchRadiusKm: 10,
      specialistServiceRadiusKm: 25,
    }),
    false
  );
});

test("dual radius: outside specialist radius", () => {
  assert.equal(
    isWithinDualRadius({
      workFormat: "offline",
      distanceKm: 12,
      userSearchRadiusKm: 25,
      specialistServiceRadiusKm: 10,
    }),
    false
  );
});

test("dual radius: online never local", () => {
  assert.equal(
    isWithinDualRadius({
      workFormat: "online",
      distanceKm: 1,
      userSearchRadiusKm: 25,
      specialistServiceRadiusKm: 25,
    }),
    false
  );
});

test("hybrid qualifies for local dual radius", () => {
  assert.equal(
    isWithinDualRadius({
      workFormat: "hybrid",
      distanceKm: 5,
      userSearchRadiusKm: 10,
      specialistServiceRadiusKm: 10,
    }),
    true
  );
});

test("missing specialist radius excludes from local", () => {
  assert.equal(
    isWithinDualRadius({
      workFormat: "offline",
      distanceKm: 1,
      userSearchRadiusKm: 10,
      specialistServiceRadiusKm: null,
    }),
    false
  );
});

test("public location: offline shows Bonn", () => {
  const loc = getPublicSpecialistLocation({
    workFormat: "offline",
    city: "Bonn",
    postalCode: "53115",
  });
  assert.equal(loc.label, "Bonn");
  assert.equal(loc.kind, "city");
});

test("public location: masked PLZ format", () => {
  const loc = getPublicSpecialistLocation({
    workFormat: "offline",
    city: "Bonn",
    postalCode: "53115",
    includeMaskedPlz: true,
  });
  assert.equal(loc.label, "531xx Bonn");
});

test("public location: online does not advertise home city", () => {
  const loc = getPublicSpecialistLocation({
    workFormat: "online",
    city: "Bonn",
    postalCode: "53115",
    onlineLabel: "Онлайн",
  });
  assert.equal(loc.label, "Онлайн");
  assert.equal(loc.kind, "online");
});

test("saveTouchesGeography detects geo keys only", () => {
  assert.equal(saveTouchesGeography({ bio: "x" }), false);
  assert.equal(saveTouchesGeography({ postal_code: "53115" }), true);
  assert.equal(saveTouchesGeography({ work_format: "offline" }), true);
  assert.equal(saveTouchesGeography({ avatar_url: "https://x" }), false);
});
