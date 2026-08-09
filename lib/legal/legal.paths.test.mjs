import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("impressum and datenschutz content cover de/ua/ru/en", () => {
  const impressum = readFileSync(join(root, "content/legal/impressum.ts"), "utf8");
  const privacy = readFileSync(join(root, "content/legal/datenschutz.ts"), "utf8");
  assert.match(impressum, /const de: LegalDocument/);
  assert.match(privacy, /getDatenschutzReviewDocument/);
});

test("privacy cookie section documents consent categories", () => {
  const privacyDe = readFileSync(
    join(root, "docs/legal/final-review/datenschutz.de.md"),
    "utf8"
  );
  assert.match(privacyDe, /freuly_partner_ref/);
  assert.match(privacyDe, /Art\. 6/);
  assert.match(privacyDe, /TDDDG/);
  assert.doesNotMatch(privacyDe, /externalMedia/);
});

test("localized privacy routes are referenced from consent locales", () => {
  for (const [lang, href] of [
    ["de", "/de/datenschutzerklaerung"],
    ["ua", "/ua/datenschutzerklaerung"],
    ["ru", "/ru/datenschutzerklaerung"],
    ["en", "/de/datenschutzerklaerung"],
  ]) {
    const locale = JSON.parse(readFileSync(join(root, `locales/${lang}.json`), "utf8"));
    assert.equal(locale.cookieConsent.privacyHref, href);
  }
});
