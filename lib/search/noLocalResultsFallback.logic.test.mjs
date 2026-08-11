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

test("online fallback href query params unchanged in specialists page", () => {
  const src = readFileSync(
    new URL("../../app/specialists/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /onlineParams\.set\("mode", "online"\)/);
  assert.match(src, /onlineParams\.set\("lang", lang\)/);
  assert.match(src, /if \(category\) onlineParams\.set\("category", category\)/);
  assert.match(src, /if \(q\) onlineParams\.set\("q", q\)/);
  assert.match(src, /const onlineHref = `\/specialists\?\$\{onlineParams\.toString\(\)\}`/);
});

test("request-service href uses existing requestServiceHref helper", () => {
  const src = readFileSync(
    new URL("../../app/specialists/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /requestServiceHref\(uiLang/);
});

test("general zero-results block keys unchanged", () => {
  const src = readFileSync(
    new URL("../../app/specialists/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /search\.noResults\.title/);
  assert.match(src, /search\.noResults\.primaryCta/);
  assert.doesNotMatch(src, /search\.noResults\.title[\s\S]*no_local_results/);
});
