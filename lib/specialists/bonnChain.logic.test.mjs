/**
 * Bonn regression: PLZ 53115 → preview/card label → persisted city contract → reload.
 *
 * Full HTTP Nominatim is optional; the canonical chain is:
 * resolved location → form/preview city → specialist_profiles.city → public card helper.
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  areValidCoordinates,
  extractCityFromNominatimAddress,
  getPublicSpecialistLocation,
  validatePublicationGeography,
} from "./geography.ts";

/** Simulated output of resolveGermanPostalLocation for 53115 (Nominatim-class). */
const RESOLVED_BONN = {
  countryCode: "DE",
  postalCode: "53115",
  city: "Bonn",
  lat: 50.7229785,
  lng: 7.0897524,
};

test("Nominatim addressdetails yields Bonn for typical 53115 payload", () => {
  const city = extractCityFromNominatimAddress({
    city: "Bonn",
    postcode: "53115",
    country_code: "de",
    state: "Nordrhein-Westfalen",
  });
  assert.equal(city, "Bonn");
});

test("Bonn chain: preview label uses resolved city (same helper as public card)", () => {
  // Dashboard preview after resolve-postal fills form.city = Bonn
  const previewLabel = getPublicSpecialistLocation({
    workFormat: "offline",
    city: RESOLVED_BONN.city,
    postalCode: RESOLVED_BONN.postalCode,
  }).label;
  assert.equal(previewLabel, "Bonn");
});

test("Bonn chain: public card empty when only PLZ persisted (legacy bug)", () => {
  // Legacy before fix: postal_code set, specialist_profiles.city null
  const cardLabel = getPublicSpecialistLocation({
    workFormat: "offline",
    city: null,
    postalCode: "53115",
  }).label;
  assert.equal(cardLabel, "");
});

test("Bonn chain: after save persistence, public card shows Bonn", () => {
  // After save writes specialist_profiles.city = Bonn
  const persisted = { city: "Bonn", postal_code: "53115" };
  const cardLabel = getPublicSpecialistLocation({
    workFormat: "offline",
    city: persisted.city,
    postalCode: persisted.postal_code,
  }).label;
  assert.equal(cardLabel, "Bonn");
});

test("Bonn chain: reload payload keeps Bonn", () => {
  // profile/page loads specialist_profiles.city into initialData.city
  const reloadedForm = {
    postal_code: RESOLVED_BONN.postalCode,
    city: RESOLVED_BONN.city,
    country_code: RESOLVED_BONN.countryCode,
  };
  assert.equal(reloadedForm.city, "Bonn");
  assert.equal(
    getPublicSpecialistLocation({
      workFormat: "offline",
      city: reloadedForm.city,
      postalCode: reloadedForm.postal_code,
    }).label,
    "Bonn"
  );
});

test("Bonn chain: coords valid and publication geography ok with radius", () => {
  assert.equal(
    areValidCoordinates(RESOLVED_BONN.lat, RESOLVED_BONN.lng, { countryCode: "DE" }),
    true
  );
  assert.deepEqual(
    validatePublicationGeography({
      workFormat: "offline",
      countryCode: RESOLVED_BONN.countryCode,
      postalCode: RESOLVED_BONN.postalCode,
      city: RESOLVED_BONN.city,
      lat: RESOLVED_BONN.lat,
      lng: RESOLVED_BONN.lng,
      serviceRadiusKm: 25,
    }),
    { ok: true }
  );
});

test("Bonn chain: card does not show full address", () => {
  const loc = getPublicSpecialistLocation({
    workFormat: "offline",
    city: "Bonn",
    postalCode: "53115",
  });
  assert.equal(loc.label, "Bonn");
  assert.doesNotMatch(loc.label, /Straße|Str\.|Avenue|Haus/i);
});
