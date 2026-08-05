import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  FREULY_LEGAL_IDENTITY,
  getFreulyPublicIdentity,
  formatFreulyWidnr,
  getFreulyInternalTaxNumber,
} from "./freulyIdentity.ts";

test("A: official legal identity contains exact tax values", () => {
  assert.equal(FREULY_LEGAL_IDENTITY.vatId, "DE464033560");
  assert.equal(FREULY_LEGAL_IDENTITY.widnr, "DE464033560");
  assert.equal(FREULY_LEGAL_IDENTITY.widnrBusinessUnit, "00001");
  assert.equal(formatFreulyWidnr(), "DE464033560-00001");
  assert.equal(getFreulyInternalTaxNumber(), "338/5113/3647");
});

test("B: public identity exposes USt-IdNr and W-IdNr but not Steuernummer", () => {
  const pub = getFreulyPublicIdentity();
  assert.equal(pub.vatId, "DE464033560");
  assert.equal(formatFreulyWidnr(), "DE464033560-00001");
  assert.equal("taxNumber" in pub, false);
});

test("K: Steuernummer not in public impressum or agreement bundles", () => {
  const impressum = readFileSync(new URL("../../content/legal/impressum.ts", import.meta.url), "utf8");
  const agreement = readFileSync(
    new URL("../../content/partners/agreementContent.ts", import.meta.url),
    "utf8"
  );
  const meta = readFileSync(new URL("../../content/partners/agreementMeta.ts", import.meta.url), "utf8");
  assert.doesNotMatch(impressum, /338\/5113\/3647/);
  assert.doesNotMatch(agreement, /338\/5113\/3647/);
  assert.doesNotMatch(meta, /338\/5113\/3647/);
  assert.match(impressum, /DE464033560/);
});

test("C: agreement provider uses public identity source", () => {
  const agreement = readFileSync(
    new URL("../../content/partners/agreementContent.ts", import.meta.url),
    "utf8"
  );
  assert.match(agreement, /getPartnerAgreementProvider/);
  assert.match(agreement, /Umsatzsteuer-Identifikationsnummer/);
  assert.match(agreement, /Wirtschafts-Identifikationsnummer/);
});
