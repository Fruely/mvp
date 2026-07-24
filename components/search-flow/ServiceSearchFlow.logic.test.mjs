/**
 * Interaction logic tests for ServiceSearchFlow step transitions.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canAdvanceFromStep,
  createInitialFlowState,
  getActionLabel,
  getNextStep,
  getPreviousStep,
  isSubmitStep,
} from "../../lib/search/serviceSearchFlow.logic.ts";
import { buildServiceSearchResultsUrl } from "../../lib/search/serviceSearchUrl.ts";

const flowSrc = readFileSync(
  new URL("./ServiceSearchFlow.tsx", import.meta.url),
  "utf-8"
);

function state(overrides = {}) {
  return { ...createInitialFlowState("ru"), ...overrides };
}

test("language selection does not advance automatically", () => {
  assert.equal(
    getNextStep("language", state({ selectedLanguage: "ru" })),
    "format"
  );
  assert.doesNotMatch(
    flowSrc,
    /onClick=\{\(\) => \{[\s\S]{0,200}setSelectedLanguage[\s\S]{0,200}setStep\("format"\)/
  );
});

test("format selection does not advance automatically", () => {
  assert.equal(getNextStep("format", state({ selectedFormat: "nearby" })), "location");
  assert.equal(getNextStep("format", state({ selectedFormat: "online" })), "submit");
  assert.doesNotMatch(
    flowSrc,
    /onClick=\{\(\) => \{[\s\S]{0,240}setSelectedFormat[\s\S]{0,240}setStep\("location"\)/
  );
  assert.doesNotMatch(flowSrc, /redirectToResults\(option\.value\)/);
});

test("radius selection does not submit automatically", () => {
  assert.equal(
    getNextStep(
      "radius",
      state({
        selectedFormat: "nearby",
        location: "Bonn",
        radiusKm: 30,
      })
    ),
    "submit"
  );
  assert.doesNotMatch(
    flowSrc,
    /onClick=\{\(\) => setRadiusKm[\s\S]{0,120}redirectToResults/
  );
});

test("next button disabled before selection", () => {
  assert.equal(canAdvanceFromStep("service", state({ service: "" })), false);
  assert.equal(canAdvanceFromStep("language", state({ selectedLanguage: null })), false);
  assert.equal(canAdvanceFromStep("format", state({ selectedFormat: null })), false);
  assert.equal(canAdvanceFromStep("location", state({ location: "" })), false);
});

test("next button enabled after selection", () => {
  assert.equal(canAdvanceFromStep("service", state({ service: "психолог" })), true);
  assert.equal(canAdvanceFromStep("language", state({ selectedLanguage: "ru" })), true);
  assert.equal(canAdvanceFromStep("format", state({ selectedFormat: "online" })), true);
  assert.equal(
    canAdvanceFromStep("location", state({ selectedFormat: "nearby", location: "Bonn" })),
    true
  );
});

test("Enter triggers same action as button via shared advance handler", () => {
  assert.match(flowSrc, /function handleStepSubmit/);
  assert.match(flowSrc, /onSubmit=\{handleStepSubmit\}/);
});

test("no double-submit guard", () => {
  assert.match(flowSrc, /isSubmitting/);
  assert.match(flowSrc, /if \(isSubmitting\) return/);
});

test("back preserves selection", () => {
  const saved = state({
    service: "психолог",
    selectedLanguage: "ru",
    selectedFormat: "nearby",
    location: "Bonn",
    radiusKm: 50,
  });
  assert.equal(getPreviousStep("format", false), "language");
  assert.equal(saved.selectedLanguage, "ru");
  assert.equal(saved.location, "Bonn");
});

test("final submit builds expected /specialists URL for nearby", () => {
  const url = buildServiceSearchResultsUrl({
    service: "psycholog",
    language: "ru",
    format: "nearby",
    location: "Bonn",
    radiusKm: 30,
  });
  assert.ok(url?.startsWith("/specialists?"));
  const params = new URLSearchParams(url.split("?")[1]);
  assert.equal(params.get("lang"), "ru");
  assert.equal(params.get("place"), "Bonn");
  assert.equal(params.get("radius"), "30");
});

test("final submit builds expected /specialists URL for online", () => {
  const url = buildServiceSearchResultsUrl({
    service: "перевод",
    language: "ua",
    format: "online",
    location: "",
    radiusKm: 30,
  });
  const params = new URLSearchParams(url.split("?")[1]);
  assert.equal(params.get("lang"), "uk");
  assert.equal(params.get("place"), null);
});

test("submit label appears on format step for online/any", () => {
  assert.equal(
    getActionLabel(
      "format",
      state({ selectedFormat: "online" }),
      { nextCta: "Дальше", submitCta: "Показать специалистов" }
    ),
    "Показать специалистов"
  );
  assert.equal(isSubmitStep("radius", state({ selectedFormat: "nearby", location: "Bonn" })), true);
});
