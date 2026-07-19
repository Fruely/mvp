import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { LEGAL_CONTENT_LANGS, LEGAL_PUBLIC_LANGS } from "../../content/legal/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readLegal(name) {
  return readFileSync(join(root, "content/legal", name), "utf8");
}

test("published legal langs are ua/ru/de only", () => {
  assert.deepEqual([...LEGAL_PUBLIC_LANGS], ["ua", "ru", "de"]);
  assert.ok(LEGAL_CONTENT_LANGS.includes("en"));
  assert.ok(!LEGAL_PUBLIC_LANGS.includes("en"));
});

test("impressum and datenschutz content cover de/ua/ru/en", () => {
  const impressum = readLegal("impressum.ts");
  const privacy = readLegal("datenschutz.ts");
  for (const lang of LEGAL_CONTENT_LANGS) {
    assert.match(impressum, new RegExp(`\\bconst ${lang}: LegalDocument`));
    assert.match(privacy, new RegExp(`\\bconst ${lang}: LegalDocument`));
  }
  assert.match(impressum, /translationNotice/);
  assert.match(privacy, /translationNotice/);
  // German editions must not set translationNotice on the de document block.
  const deImpressum = impressum.split("const ua:")[0];
  assert.doesNotMatch(deImpressum, /translationNotice/);
});

test("privacy cookie section documents consent categories", () => {
  const privacy = readLegal("datenschutz.ts");
  assert.match(privacy, /necessary/);
  assert.match(privacy, /Google Analytics 4/);
  assert.match(privacy, /Consent Mode/);
  assert.match(privacy, /externalMedia/);
  assert.match(privacy, /noch keine externen Medien/);
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
