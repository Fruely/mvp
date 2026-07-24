/**
 * Unit tests for placeSearch URL builder and helpers.
 * Reads source directly to avoid @/ alias resolution in node --test.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("./placeSearch.ts", import.meta.url), "utf-8");

describe("Nominatim URL in placeSearch.ts source", () => {
  it("uses countrycodes=de", () => {
    assert.ok(
      src.includes("countrycodes=de"),
      "source must contain countrycodes=de"
    );
  });

  it("does NOT use country=Germany", () => {
    assert.ok(
      !src.includes("country=Germany"),
      "source must not contain country=Germany"
    );
  });

  it("preserves format=json", () => {
    assert.ok(src.includes("format=json"));
  });

  it("preserves limit=1", () => {
    assert.ok(src.includes("limit=1"));
  });

  it("uses encodeURIComponent for the query", () => {
    assert.ok(src.includes("encodeURIComponent"));
  });

  it("uses nominatim.openstreetmap.org/search endpoint", () => {
    assert.ok(src.includes("nominatim.openstreetmap.org/search"));
  });
});

describe("buildNominatimSearchUrl contract (inline eval)", () => {
  const urlMatch = src.match(
    /export function buildNominatimSearchUrl\(city:\s*string\):\s*string\s*\{([\s\S]*?)\n\}/
  );
  assert.ok(urlMatch, "buildNominatimSearchUrl must be exported");

  const fnBody = urlMatch[1];
  const fn = new Function(
    "city",
    `const encodeURIComponent = globalThis.encodeURIComponent;\n${fnBody.replace(/return\s*\(/, "return (")}`
  );

  it("produces correct URL for Bonn", () => {
    const url = fn("Bonn");
    assert.ok(url.startsWith("https://nominatim.openstreetmap.org/search?q=Bonn"));
    assert.ok(url.includes("countrycodes=de"));
    assert.ok(url.includes("format=json"));
    assert.ok(url.includes("limit=1"));
    assert.ok(!url.includes("country=Germany"));
  });

  it("URL-encodes Köln", () => {
    const url = fn("Köln");
    assert.ok(url.includes(encodeURIComponent("Köln")));
  });

  it("URL-encodes Cyrillic Бонн", () => {
    const url = fn("Бонн");
    assert.ok(url.includes(encodeURIComponent("Бонн")));
    assert.ok(url.includes("countrycodes=de"));
  });

  it("handles spaces", () => {
    const url = fn("Bad Godesberg");
    assert.ok(
      url.includes("Bad%20Godesberg") || url.includes("Bad+Godesberg"),
      "spaces must be encoded"
    );
  });
});
