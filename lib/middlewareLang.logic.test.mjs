import assert from "node:assert/strict";
import test from "node:test";
import { langFromCookie } from "./i18n.ts";
import { resolveSpecialistsUiLang } from "./search/specialistsUiLang.ts";

function legacySpecialistDashboardPath(cookieLang, rest = "") {
  const lang = langFromCookie(cookieLang);
  return `/${lang}/specialist/dashboard${rest}`;
}

function resolveSpecialistsMiddlewareLang(input) {
  return resolveSpecialistsUiLang({
    queryLang: input.queryLang,
    cookieLang: input.cookieLang,
  });
}

test("legacy dashboard without cookie → ru", () => {
  assert.equal(legacySpecialistDashboardPath(undefined), "/ru/specialist/dashboard");
  assert.equal(legacySpecialistDashboardPath("fr"), "/ru/specialist/dashboard");
});

test("legacy dashboard respects valid cookie", () => {
  assert.equal(legacySpecialistDashboardPath("ua"), "/ua/specialist/dashboard");
  assert.equal(legacySpecialistDashboardPath("de", "/leads"), "/de/specialist/dashboard/leads");
});

test("/specialists middleware lang resolution", () => {
  assert.equal(resolveSpecialistsMiddlewareLang({ queryLang: null, cookieLang: null }), "ru");
  assert.equal(resolveSpecialistsMiddlewareLang({ queryLang: "ua", cookieLang: "de" }), "ua");
  assert.equal(resolveSpecialistsMiddlewareLang({ queryLang: null, cookieLang: "ua" }), "ua");
  assert.equal(resolveSpecialistsMiddlewareLang({ queryLang: "fr", cookieLang: "fr" }), "ru");
});

test("langFromCookie is ru default for app/login-style resolution", () => {
  assert.equal(langFromCookie(undefined), "ru");
  assert.equal(langFromCookie("ua"), "ua");
  assert.equal(langFromCookie("de"), "de");
});
