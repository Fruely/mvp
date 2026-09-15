import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  shouldOfferOnlineFallbackForNoLocalResults,
  shouldRetryOnlineForEmptyCategorySearch,
} from "./noLocalResultsFallback.ts";

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

test("nearby category with no_local_results retries online instead of wizard", () => {
  assert.equal(
    shouldRetryOnlineForEmptyCategorySearch({
      empty: true,
      category: "coaches",
      isOnlineList: false,
      fallback: "no_local_results",
    }),
    true,
  );
  assert.equal(
    shouldRetryOnlineForEmptyCategorySearch({
      empty: true,
      category: "coaches",
      isOnlineList: true,
      fallback: "no_local_results",
    }),
    false,
    "already-online empty search must not retry",
  );
  assert.equal(
    shouldRetryOnlineForEmptyCategorySearch({
      empty: true,
      category: null,
      isOnlineList: false,
      fallback: "no_local_results",
    }),
    false,
    "free-text nearby stays free-text / assisted matching",
  );
  assert.equal(
    shouldRetryOnlineForEmptyCategorySearch({
      empty: false,
      category: "coaches",
      isOnlineList: false,
      fallback: "no_local_results",
    }),
    false,
  );
});

test("optional online retry remains secondary on no-match page", () => {
  const src = readFileSync(
    new URL("../../app/specialists/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /secondaryHref/);
  assert.match(src, /search\.assistedMatching\.secondaryOnlineCta/);
});
