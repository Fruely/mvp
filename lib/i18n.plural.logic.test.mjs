import assert from "node:assert/strict";
import test from "node:test";
import { pluralForm, slavicPluralForm, tCount } from "./i18n.ts";

test("slavicPluralForm: one / few / many", () => {
  assert.equal(slavicPluralForm(1), "one");
  assert.equal(slavicPluralForm(21), "one");
  assert.equal(slavicPluralForm(2), "few");
  assert.equal(slavicPluralForm(4), "few");
  assert.equal(slavicPluralForm(22), "few");
  assert.equal(slavicPluralForm(5), "many");
  assert.equal(slavicPluralForm(11), "many");
  assert.equal(slavicPluralForm(12), "many");
  assert.equal(slavicPluralForm(0), "many");
});

test("pluralForm: German is one vs many", () => {
  assert.equal(pluralForm("de", 1), "one");
  assert.equal(pluralForm("de", 2), "many");
  assert.equal(pluralForm("de", 21), "many");
  assert.equal(pluralForm("ru", 21), "one");
  assert.equal(pluralForm("ua", 3), "few");
});

test("tCount picks nested forms and replaces placeholders", () => {
  const dict = {
    category: {
      parent: {
        found: {
          one: "{{count}} специалист",
          few: "{{count}} специалиста",
          many: "{{count}} специалистов",
        },
      },
    },
    search: {
      results: {
        count: {
          one: '{{count}} Ergebnis für "{{language}}".',
          many: '{{count}} Ergebnisse für "{{language}}".',
        },
      },
    },
  };

  assert.equal(tCount(dict, "ru", "category.parent.found", 1), "1 специалист");
  assert.equal(tCount(dict, "ru", "category.parent.found", 2), "2 специалиста");
  assert.equal(tCount(dict, "ru", "category.parent.found", 5), "5 специалистов");
  assert.equal(
    tCount(dict, "de", "search.results.count", 1, { language: "de" }),
    '1 Ergebnis für "de".'
  );
  assert.equal(
    tCount(dict, "de", "search.results.count", 3, { language: "de" }),
    '3 Ergebnisse für "de".'
  );
});
