import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import {
  isConsentLang,
  readFreulyLangCookie,
  resolveConsentLang,
} from "./cookieConsentLang.ts";
import { COOKIE_CONSENT_STORAGE_KEY } from "./cookieConsent.ts";

const require = createRequire(import.meta.url);

const REQUIRED_COPY_KEYS = [
  "title",
  "body",
  "privacyLink",
  "privacyHref",
  "acceptAll",
  "rejectOptional",
  "settings",
  "saveSelection",
  "close",
  "necessaryTitle",
  "necessaryDescription",
  "necessaryAlwaysOn",
  "analyticsTitle",
  "analyticsDescription",
  "referralTitle",
  "referralDescription",
  "settingsAria",
];

function loadCopy(lang) {
  const locale = require(`../../locales/${lang}.json`);
  return locale.cookieConsent;
}

test("consent langs include ua/ru/de/en", () => {
  assert.equal(isConsentLang("ua"), true);
  assert.equal(isConsentLang("en"), true);
  assert.equal(isConsentLang("fr"), false);
});

test("resolveConsentLang prefers URL locale", () => {
  assert.equal(resolveConsentLang("/ru"), "ru");
  assert.equal(resolveConsentLang("/ru/category/tutors"), "ru");
  assert.equal(resolveConsentLang("/ua/specialists"), "ua");
  assert.equal(resolveConsentLang("/de"), "de");
  assert.equal(resolveConsentLang("/en/anything"), "en");
});

test("resolveConsentLang legal pages are German", () => {
  assert.equal(resolveConsentLang("/datenschutzerklaerung"), "de");
  assert.equal(resolveConsentLang("/impressum"), "de");
});

test("resolveConsentLang /app uses freuly_lang cookie", () => {
  assert.equal(resolveConsentLang("/app", "ru"), "ru");
  assert.equal(resolveConsentLang("/app/install", "de"), "de");
  assert.equal(resolveConsentLang("/app", null), "ru");
  assert.equal(resolveConsentLang("/app", "fr"), "ru");
});

test("resolveConsentLang /login and /specialists use freuly_lang cookie", () => {
  assert.equal(resolveConsentLang("/login", "de"), "de");
  assert.equal(resolveConsentLang("/login", "ru"), "ru");
  assert.equal(resolveConsentLang("/login", null), "ru");
  assert.equal(resolveConsentLang("/specialists", "de"), "de");
  assert.equal(resolveConsentLang("/specialists", "ua"), "ua");
  assert.equal(resolveConsentLang("/specialists", null), "ru");
});

test("resolveConsentLang unsupported path falls back to en", () => {
  assert.equal(resolveConsentLang("/"), "en");
  assert.equal(resolveConsentLang("/unknown", "de"), "en");
});

test("readFreulyLangCookie parses cookie string", () => {
  assert.equal(readFreulyLangCookie("a=1; freuly_lang=de; b=2"), "de");
  assert.equal(readFreulyLangCookie("freuly_lang=ua"), "ua");
  assert.equal(readFreulyLangCookie(""), null);
});

test("locale cookieConsent blocks exist for ua/ru/de/en without empty keys", () => {
  for (const lang of ["ua", "ru", "de", "en"]) {
    const copy = loadCopy(lang);
    assert.ok(copy && typeof copy === "object", `${lang} missing cookieConsent`);
    for (const key of REQUIRED_COPY_KEYS) {
      assert.ok(
        typeof copy[key] === "string" && copy[key].trim().length > 0,
        `${lang}.${key} empty`
      );
    }
  }
});

test("Russian and Ukrainian copy are not German leftovers", () => {
  const ru = loadCopy("ru");
  const ua = loadCopy("ua");
  assert.doesNotMatch(ru.title, /Cookie-Einstellungen/);
  assert.doesNotMatch(ru.acceptAll, /Alle akzeptieren/);
  assert.doesNotMatch(ua.title, /Cookie-Einstellungen/);
  assert.match(ru.rejectOptional, /необязательн/i);
  assert.match(ua.rejectOptional, /необов/i);
});

test("consent storage key unchanged (v1)", () => {
  assert.equal(COOKIE_CONSENT_STORAGE_KEY, "freuly_cookie_consent_v1");
});

test("privacyHref follows public locales; en uses German page", () => {
  assert.equal(loadCopy("de").privacyHref, "/de/datenschutzerklaerung");
  assert.equal(loadCopy("ua").privacyHref, "/ua/datenschutzerklaerung");
  assert.equal(loadCopy("ru").privacyHref, "/ru/datenschutzerklaerung");
  assert.equal(loadCopy("en").privacyHref, "/de/datenschutzerklaerung");
  assert.match(loadCopy("en").privacyLink, /German/i);
});
