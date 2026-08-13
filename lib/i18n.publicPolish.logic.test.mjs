import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { tCount } from "./i18n.ts";

const require = createRequire(import.meta.url);

function loadLocale(lang) {
  return require(`../locales/${lang}.json`);
}

test("locale plural keys exist for ru/ua/de", () => {
  for (const lang of ["ru", "ua", "de"]) {
    const dict = loadLocale(lang);
    assert.equal(typeof dict.category.found.one, "string");
    assert.equal(typeof dict.category.found.many, "string");
    assert.equal(typeof dict.category.parent.found.one, "string");
    assert.equal(typeof dict.category.parent.found.many, "string");
    assert.equal(typeof dict.search.results.count.one, "string");
    assert.equal(typeof dict.search.results.count.many, "string");
    if (lang !== "de") {
      assert.equal(typeof dict.category.found.few, "string");
      assert.equal(typeof dict.category.parent.found.few, "string");
    }
  }
});

test("real locale dictionaries pluralize specialist counts", () => {
  const ru = loadLocale("ru");
  const de = loadLocale("de");
  const ua = loadLocale("ua");
  assert.equal(tCount(ru, "ru", "category.parent.found", 1), "1 специалист");
  assert.equal(tCount(ru, "ru", "category.parent.found", 2), "2 специалиста");
  assert.equal(tCount(de, "de", "category.parent.found", 1), "1 Fachkraft");
  assert.equal(tCount(de, "de", "category.parent.found", 3), "3 Fachkräfte");
  assert.equal(tCount(ua, "ua", "category.parent.found", 1), "1 спеціаліст");
  assert.equal(tCount(ua, "ua", "category.parent.found", 5), "5 спеціалістів");
});

test("homepage story quote is localized, not CMS text", () => {
  const homeSrc = readFileSync(new URL("../app/[lang]/HomeClient.tsx", import.meta.url), "utf8");
  assert.match(homeSrc, /home\.variantC\.story\.quote/);
  assert.doesNotMatch(homeSrc, /homepage_text_image/);
  assert.doesNotMatch(homeSrc, /textImageContent/);
  for (const lang of ["ru", "ua", "de"]) {
    const quote = loadLocale(lang)["home.variantC.story.quote"];
    assert.ok(typeof quote === "string" && quote.trim().length > 0, `${lang} story quote`);
  }
  assert.doesNotMatch(loadLocale("de")["home.variantC.story.quote"], /[А-Яа-яЁё]/);
});

test("category metadata uses localized name and title template", () => {
  const layoutSrc = readFileSync(
    new URL("../app/[lang]/category/[slug]/layout.tsx", import.meta.url),
    "utf8",
  );
  assert.match(layoutSrc, /getDictionary/);
  assert.match(layoutSrc, /category\.metaTitle/);
  assert.match(layoutSrc, /categories/);
  assert.doesNotMatch(layoutSrc, /специалисты \| Freuly/);
  for (const lang of ["ru", "ua", "de"]) {
    const dict = loadLocale(lang);
    assert.match(dict.category.metaTitle, /\{\{name\}\}/);
    assert.ok(dict.categories["house-garden"]);
  }
  assert.match(loadLocale("de").categories["house-garden"], /Haus/);
  assert.match(loadLocale("ru").category.metaTitle, /специалисты/);
  assert.match(loadLocale("de").category.metaTitle, /Fachkräfte/);
});

test("login page generates localized document title from cookie lang", () => {
  const src = readFileSync(new URL("../app/login/page.tsx", import.meta.url), "utf8");
  assert.match(src, /generateMetadata/);
  assert.match(src, /login\.title/);
  assert.match(src, /freuly_lang/);
  assert.doesNotMatch(src, /специалист на твоём языке/);
});

test("login form uses i18n and locale-aware reset link", () => {
  const src = readFileSync(
    new URL("../app/specialist/claim/SpecialistPasswordSignIn.tsx", import.meta.url),
    "utf8",
  );
  assert.match(src, /login\.title/);
  assert.match(src, /\/\$\{lang\}\/reset-password/);
  assert.doesNotMatch(src, /Забули пароль/);
  assert.doesNotMatch(src, /href="\/ua\/reset-password"/);
  for (const lang of ["ru", "ua", "de"]) {
    const dict = loadLocale(lang);
    assert.ok(dict.login?.title);
    assert.ok(dict.login?.forgotPassword);
  }
  assert.match(loadLocale("de").login.title, /Anmeldung/);
});
