import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PARTNER_AGREEMENT_VERSION } from "./featureFlags.ts";

const localeFiles = [
  new URL("../../locales/de.json", import.meta.url),
  new URL("../../locales/ru.json", import.meta.url),
  new URL("../../locales/ua.json", import.meta.url),
];

function readJson(url) {
  return JSON.parse(readFileSync(url, "utf8"));
}

test("A: public partner landing copy does not hardcode current version 1.0", () => {
  for (const file of localeFiles) {
    const dict = readJson(file);
    const howSteps = dict.partner?.public?.howSteps ?? "";
    assert.doesNotMatch(
      howSteps,
      /Version 1\.0|версии 1\.0|версії 1\.0/i,
      `hardcoded v1.0 in howSteps: ${file.pathname}`
    );
  }
});

test("B: agreement page uses central current version from agreement source", () => {
  const agreementPage = readFileSync(
    new URL("../../app/[lang]/partners/agreement/page.tsx", import.meta.url),
    "utf8"
  );
  const agreementClient = readFileSync(
    new URL("../../components/partners/PartnerAgreementClient.tsx", import.meta.url),
    "utf8"
  );
  assert.match(agreementPage, /getPartnerAgreement\(lang\)/);
  assert.match(agreementPage, /version=\{doc\.version\}/);
  assert.match(agreementClient, /version,\s*\n/);
  assert.equal(PARTNER_AGREEMENT_VERSION, "1.2");
});

test("C: historic v1.0 content and frozen hash remain unchanged", () => {
  const v10 = readFileSync(
    new URL("../../content/partners/agreementContentV10.ts", import.meta.url),
    "utf8"
  );
  assert.match(v10, /PARTNER_AGREEMENT_V10_VERSION = "1\.0"/);
  assert.match(v10, /Immutable Partner Agreement v1\.0/);
  const meta = readFileSync(
    new URL("../../content/partners/agreementMeta.ts", import.meta.url),
    "utf8"
  );
  assert.match(meta, /PARTNER_AGREEMENT_LEGACY_VERSION = "1\.0"/);
  const hashSrc = readFileSync(new URL("./agreementHash.ts", import.meta.url), "utf8");
  assert.match(hashSrc, /PARTNER_AGREEMENT_V10_SHA256/);
  assert.match(hashSrc, /getGermanAgreementPlainTextV10/);
});

test("D: v1.2 is current version for new acceptance", () => {
  const acceptRoute = readFileSync(
    new URL("../../app/api/partner/agreement/accept/route.ts", import.meta.url),
    "utf8"
  );
  assert.match(acceptRoute, /PARTNER_AGREEMENT_VERSION/);
  assert.match(acceptRoute, /agreement_version_mismatch/);
  assert.equal(PARTNER_AGREEMENT_VERSION, "1.2");
});

test("E: DE/RU/UA agreement checkbox uses dynamic version placeholder", () => {
  for (const file of localeFiles) {
    const dict = readJson(file);
    const checkbox = dict.partner?.agreement?.checkbox ?? "";
    assert.match(checkbox, /\{\{version\}\}/, `missing {{version}} in checkbox: ${file.pathname}`);
    assert.doesNotMatch(checkbox, /1\.0/, `hardcoded 1.0 in checkbox: ${file.pathname}`);
  }
  const client = readFileSync(
    new URL("../../components/partners/PartnerAgreementClient.tsx", import.meta.url),
    "utf8"
  );
  assert.match(client, /\.replace\("\{\{version\}\}", version\)/);
});
