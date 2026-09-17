import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAcquisitionFirstTouch,
  parseAcquisitionSnapshot,
  serializeAcquisitionCookie,
  parseAcquisitionCookie,
  pickAcquisitionForServiceRequest,
} from "./firstTouch.ts";

test("paid social UTM maps to existing acquisition fields and keeps landing path", () => {
  const touch = buildAcquisitionFirstTouch({
    href: "https://freuly.de/ru/request?utm_source=meta&utm_medium=paid_social&utm_campaign=lead_form&utm_content=carousel&utm_term=fotograf",
    referrer: "https://www.facebook.com/",
    ownHostname: "freuly.de",
    capturedAt: "2026-09-17T17:00:00.000Z",
  });
  assert.ok(touch);
  assert.equal(touch.source, "meta");
  assert.equal(touch.medium, "paid_social");
  assert.equal(touch.campaign, "lead_form");
  assert.equal(touch.content, "carousel");
  assert.equal(touch.term, "fotograf");
  assert.match(touch.landing_path, /^\/ru\/request\?/);
  assert.equal(touch.referrer, "https://www.facebook.com/");
});

test("paid landing UTM wins over an older cookie, homepage submit keeps first-touch cookie", () => {
  const paid = buildAcquisitionFirstTouch({
    href: "https://freuly.de/ua/request?utm_source=meta&utm_medium=paid_social&utm_campaign=lead_form",
    capturedAt: "2026-09-17T17:00:00.000Z",
  });
  const olderCookie = buildAcquisitionFirstTouch({
    href: "https://freuly.de/ru?utm_source=google",
    capturedAt: "2026-08-01T10:00:00.000Z",
  });
  const homepageEntry = buildAcquisitionFirstTouch({
    href: "https://freuly.de/de/request",
    capturedAt: "2026-09-17T18:00:00.000Z",
  });
  assert.ok(paid && olderCookie && homepageEntry);
  assert.deepEqual(pickAcquisitionForServiceRequest(paid, olderCookie), paid);
  assert.deepEqual(pickAcquisitionForServiceRequest(homepageEntry, olderCookie), olderCookie);
  assert.deepEqual(pickAcquisitionForServiceRequest(homepageEntry, null), homepageEntry);
});

test("acquisition snapshot survives serialize/parse like a cookie kept across form steps", () => {
  const original = buildAcquisitionFirstTouch({
    href: "https://freuly.de/de/request?utm_source=meta&utm_medium=paid_social&utm_campaign=sept",
    capturedAt: "2026-09-17T17:00:00.000Z",
  });
  assert.ok(original);
  const roundTrip = parseAcquisitionCookie(serializeAcquisitionCookie(original));
  assert.deepEqual(roundTrip, original);
  assert.deepEqual(parseAcquisitionSnapshot(original), original);
});
