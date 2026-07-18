/**
 * Optional live Nominatim smoke for PLZ 53115 → Bonn.
 * Not part of the default deterministic suite.
 *
 * Run explicitly:
 *   FREULY_LIVE_NOMINATIM=1 node --experimental-strip-types --test lib/specialists/bonnNominatim.smoke.test.mjs
 */
import assert from "node:assert/strict";
import test from "node:test";
import {
  areValidCoordinates,
  extractCityFromNominatimAddress,
  getPublicSpecialistLocation,
} from "./geography.ts";

const enabled = process.env.FREULY_LIVE_NOMINATIM === "1";

test("live Nominatim 53115 → Bonn", { skip: !enabled }, async () => {
  const res = await fetch(
    "https://nominatim.openstreetmap.org/search?postalcode=53115&country=Germany&format=json&addressdetails=1&limit=1",
    { headers: { "User-Agent": "Freuly-App" }, signal: AbortSignal.timeout(8000) }
  );
  assert.equal(res.ok, true, `Nominatim HTTP ${res.status}`);
  const data = await res.json();
  assert.ok(Array.isArray(data) && data[0]);
  const city = extractCityFromNominatimAddress(data[0].address ?? null);
  assert.equal(city, "Bonn");
  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  assert.equal(areValidCoordinates(lat, lng, { countryCode: "DE" }), true);
  assert.equal(
    getPublicSpecialistLocation({
      workFormat: "offline",
      city,
      postalCode: "53115",
    }).label,
    "Bonn"
  );
});
