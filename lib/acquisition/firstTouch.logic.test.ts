import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAcquisitionFirstTouch,
  classifyReferrerSource,
  deriveAcquisitionMetadata,
  isAiAcquisitionSource,
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

test("known AI referrers are classified as dedicated acquisition sources", () => {
  assert.equal(classifyReferrerSource("https://chatgpt.com/c/abc"), "chatgpt");
  assert.equal(classifyReferrerSource("https://chat.openai.com/c/legacy"), "chatgpt");
  assert.equal(classifyReferrerSource("https://gemini.google.com/app/abc"), "gemini");
  assert.equal(classifyReferrerSource("https://claude.ai/chat/abc"), "claude");
  assert.equal(classifyReferrerSource("https://www.perplexity.ai/search/abc"), "perplexity");
  assert.equal(classifyReferrerSource("https://copilot.microsoft.com/"), "copilot");
  assert.equal(classifyReferrerSource("https://grok.com/"), "grok");
  assert.equal(classifyReferrerSource("https://poe.com/"), "poe");
});

test("Gemini is classified before the broad google.com rule", () => {
  assert.equal(classifyReferrerSource("https://gemini.google.com/"), "gemini");
  assert.equal(classifyReferrerSource("https://www.google.com/search?q=freuly"), "google");
});

test("AI referral survives the normal first-touch capture path", () => {
  const touch = buildAcquisitionFirstTouch({
    href: "https://freuly.de/ru/request",
    referrer: "https://chatgpt.com/",
    capturedAt: "2026-09-20T18:00:00.000Z",
  });

  assert.ok(touch);
  assert.equal(touch.source, "chatgpt");
  assert.equal(isAiAcquisitionSource(touch.source), true);
  assert.equal(touch.referrer, "https://chatgpt.com/");
});

test("explicit AI UTM sources can be identified even when referrer is unavailable", () => {
  const touch = buildAcquisitionFirstTouch({
    href: "https://freuly.de/de/request?utm_source=perplexity&utm_medium=ai_referral",
    capturedAt: "2026-09-20T18:00:00.000Z",
  });

  assert.ok(touch);
  assert.equal(touch.source, "perplexity");
  assert.equal(touch.medium, "ai_referral");
  assert.equal(isAiAcquisitionSource(touch.source), true);
  assert.equal(isAiAcquisitionSource("google"), false);
});


test("AI referral metadata is high confidence when referrer identifies the provider", () => {
  const touch = buildAcquisitionFirstTouch({
    href: "https://freuly.de/ru/request",
    referrer: "https://chatgpt.com/c/abc",
    capturedAt: "2026-09-20T18:00:00.000Z",
  });

  assert.ok(touch);
  assert.deepEqual(deriveAcquisitionMetadata(touch), {
    acquisition_channel: "ai",
    ai_provider: "chatgpt",
    ai_interaction_type: "ai_referral",
    attribution_confidence: "high",
  });
});

test("AI UTM without referrer is medium confidence and cannot self-assert ai_agent", () => {
  const touch = buildAcquisitionFirstTouch({
    href: "https://freuly.de/de/request?utm_source=claude&utm_medium=ai_agent",
    capturedAt: "2026-09-20T18:00:00.000Z",
  });

  assert.ok(touch);
  assert.deepEqual(deriveAcquisitionMetadata(touch), {
    acquisition_channel: "ai",
    ai_provider: "claude",
    ai_interaction_type: "ai_referral",
    attribution_confidence: "medium",
  });
});

test("non-AI acquisition does not fabricate AI metadata", () => {
  const touch = buildAcquisitionFirstTouch({
    href: "https://freuly.de/ru/request?utm_source=meta&utm_medium=paid_social",
    capturedAt: "2026-09-20T18:00:00.000Z",
  });

  assert.ok(touch);
  assert.deepEqual(deriveAcquisitionMetadata(touch), {
    acquisition_channel: null,
    ai_provider: null,
    ai_interaction_type: null,
    attribution_confidence: null,
  });
});
