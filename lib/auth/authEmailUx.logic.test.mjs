import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import {
  langFromSafeNextPath,
  resolveLoginLang,
} from "./loginLang.ts";
import { mapSupabaseAuthError } from "./mapSupabaseAuthError.ts";
import { resolveSafeNextPath } from "./safeNextPath.ts";

const require = createRequire(import.meta.url);

function loadLoginDict(lang) {
  return require(`../../locales/${lang}.json`).login;
}

function dictFromLogin(lang) {
  return { login: loadLoginDict(lang) };
}

test("langFromSafeNextPath extracts ru/ua/de from localized next paths", () => {
  assert.equal(langFromSafeNextPath("/ru/partners/onboarding"), "ru");
  assert.equal(langFromSafeNextPath("/ua/partners/onboarding"), "ua");
  assert.equal(langFromSafeNextPath("/de/partners/onboarding"), "de");
  assert.equal(langFromSafeNextPath("/ru"), "ru");
  assert.equal(langFromSafeNextPath("/en/partners/onboarding"), null);
  assert.equal(langFromSafeNextPath("/partners/onboarding"), null);
});

test("resolveLoginLang prefers localized next over cookie", () => {
  assert.equal(
    resolveLoginLang({ cookieLang: "ua", safeNext: "/ru/partners/onboarding" }),
    "ru"
  );
  assert.equal(
    resolveLoginLang({ cookieLang: "de", safeNext: "/ua/partners/onboarding" }),
    "ua"
  );
  assert.equal(
    resolveLoginLang({ cookieLang: "ua", safeNext: "/de/partners/onboarding" }),
    "de"
  );
});

test("resolveLoginLang falls back to freuly_lang cookie when next has no locale", () => {
  assert.equal(
    resolveLoginLang({ cookieLang: "de", safeNext: "/partners/onboarding" }),
    "de"
  );
  assert.equal(resolveLoginLang({ cookieLang: "ua", safeNext: null }), "ua");
  assert.equal(resolveLoginLang({ cookieLang: "fr", safeNext: null }), "ru");
});

test("invalid next cannot inject locale via resolveSafeNextPath", () => {
  const malicious = "https://evil.test/ru/partners/onboarding";
  assert.equal(resolveSafeNextPath(malicious), null);
  assert.equal(
    resolveLoginLang({ cookieLang: "ua", safeNext: resolveSafeNextPath(malicious) }),
    "ua"
  );

  const protocolRelative = "//evil.test/ru/partners/onboarding";
  assert.equal(resolveSafeNextPath(protocolRelative), null);

  const fakePrefix = "/ru-evil/partners/onboarding";
  assert.equal(resolveSafeNextPath(fakePrefix), fakePrefix);
  assert.equal(langFromSafeNextPath(fakePrefix), null);
  assert.equal(
    resolveLoginLang({ cookieLang: "de", safeNext: fakePrefix }),
    "de"
  );
});

test("mapSupabaseAuthError maps email rate limit for signup", () => {
  const dict = dictFromLogin("ru");
  const msg = mapSupabaseAuthError(
    { message: "email rate limit exceeded", status: 429 },
    dict,
    "signup"
  );
  assert.equal(msg, loadLoginDict("ru").errorEmailRateLimit);
  assert.doesNotMatch(msg, /rate limit exceeded/i);
});

test("mapSupabaseAuthError maps recovery rate limit", () => {
  const dict = dictFromLogin("de");
  const msg = mapSupabaseAuthError(
    { message: "Email rate limit exceeded", status: 429 },
    dict,
    "recovery"
  );
  assert.equal(msg, loadLoginDict("de").errorRecoveryRateLimit);
});

test("mapSupabaseAuthError maps already registered", () => {
  const dict = dictFromLogin("ua");
  const msg = mapSupabaseAuthError(
    { message: "User already registered", code: "user_already_exists" },
    dict,
    "signup"
  );
  assert.equal(msg, loadLoginDict("ua").errorAlreadyRegistered);
});

test("mapSupabaseAuthError maps invalid credentials", () => {
  const dict = dictFromLogin("ru");
  const msg = mapSupabaseAuthError(
    { message: "Invalid login credentials" },
    dict,
    "signin"
  );
  assert.equal(msg, loadLoginDict("ru").errorInvalid);
});

test("mapSupabaseAuthError uses localized generic fallback", () => {
  const dict = dictFromLogin("de");
  assert.equal(
    mapSupabaseAuthError({ message: "some unknown provider error" }, dict, "signin"),
    loadLoginDict("de").errorSignIn
  );
  assert.equal(
    mapSupabaseAuthError({ message: "weird" }, dict, "recovery"),
    loadLoginDict("de").errorRecoveryGeneric
  );
});

test("signUp options shape includes locale metadata only", () => {
  const signUpPayload = {
    email: "user@example.com",
    password: "secret",
    options: {
      data: {
        locale: "ru",
      },
    },
  };
  assert.equal(signUpPayload.options.data.locale, "ru");
  assert.equal("emailRedirectTo" in (signUpPayload.options ?? {}), false);
});
