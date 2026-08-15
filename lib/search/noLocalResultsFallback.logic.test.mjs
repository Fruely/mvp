import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { shouldOfferOnlineFallbackForNoLocalResults } from "./noLocalResultsFallback.ts";

test("nearby format (place + radius) does not offer online fallback", () => {
  assert.equal(
    shouldOfferOnlineFallbackForNoLocalResults({ place: "50667", radius: "30" }),
    false,
  );
  assert.equal(
    shouldOfferOnlineFallbackForNoLocalResults({ place: "Köln", radius: "100" }),
    false,
  );
});

test("legacy local URL (place without radius) may offer online fallback", () => {
  assert.equal(
    shouldOfferOnlineFallbackForNoLocalResults({ place: "Köln", radius: null }),
    true,
  );
  assert.equal(
    shouldOfferOnlineFallbackForNoLocalResults({ place: "50667", radius: "" }),
    true,
  );
});

test("missing place never offers online fallback", () => {
  assert.equal(
    shouldOfferOnlineFallbackForNoLocalResults({ place: null, radius: "30" }),
    false,
  );
});

test("no-match specialists page routes to assisted matching", () => {
  const src = readFileSync(
    new URL("../../app/specialists/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /AssistedMatchingContinuation/);
  assert.match(src, /assistedPrefillToRequestHref/);
  assert.match(src, /search\.assistedMatching\.primaryCta/);
});

test("optional online retry remains secondary on no-match page", () => {
  const src = readFileSync(
    new URL("../../app/specialists/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /secondaryHref/);
  assert.match(src, /search\.assistedMatching\.secondaryOnlineCta/);
});
