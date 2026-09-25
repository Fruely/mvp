import assert from "node:assert/strict";
import test from "node:test";

import { SERVICE_INTENT_FIELD_CODES, SERVICE_INTENT_LOCALES } from "./contract.ts";
import { QUESTION_PRIORITY, selectNextQuestion } from "./nextQuestion.ts";

test("no question is asked when nothing critical is missing", () => {
  assert.equal(
    selectNextQuestion({
      locale: "ru",
      missingFields: [],
      resolvedFields: [],
      modelQuestion: null,
    }),
    null,
  );
});

test("the documented priority decides which single field is asked", () => {
  const question = selectNextQuestion({
    locale: "ru",
    missingFields: ["service_detail", "timing", "location", "requested_service"],
    resolvedFields: [],
    modelQuestion: null,
  });
  assert.equal(question?.field_code, "requested_service");

  // Order of the priority list itself, so a reorder is a deliberate change.
  assert.deepEqual(QUESTION_PRIORITY, [
    "requested_service",
    "work_format",
    "location",
    "timing",
    "preferred_language",
    "service_detail",
  ]);
});

test('8. a field answered with "no preference" is never asked again', () => {
  const first = selectNextQuestion({
    locale: "ru",
    missingFields: ["work_format", "timing"],
    resolvedFields: [],
    modelQuestion: null,
  });
  assert.equal(first?.field_code, "work_format");
  assert.equal(first?.allow_no_preference, true);

  const second = selectNextQuestion({
    locale: "ru",
    missingFields: ["work_format", "timing"],
    resolvedFields: ["work_format"],
    modelQuestion: null,
  });
  assert.equal(second?.field_code, "timing");

  const third = selectNextQuestion({
    locale: "ru",
    missingFields: ["work_format", "timing"],
    resolvedFields: ["work_format", "timing"],
    modelQuestion: null,
  });
  assert.equal(third, null);
});

test("the model supplies wording only, never the decision", () => {
  const question = selectNextQuestion({
    locale: "ru",
    missingFields: ["location"],
    resolvedFields: [],
    modelQuestion: {
      field_code: "timing",
      text: "Когда удобно?",
      options: ["Сегодня"],
      allow_no_preference: false,
    },
  });
  // The model wanted timing; code asks about the higher-priority missing field.
  assert.equal(question?.field_code, "location");
  assert.equal(question?.text, "В каком городе или районе?");

  const matching = selectNextQuestion({
    locale: "ru",
    missingFields: ["location"],
    resolvedFields: [],
    modelQuestion: {
      field_code: "location",
      text: "В каком районе Гамбурга нужен мастер?",
      options: ["Altona", "Eimsbüttel"],
      allow_no_preference: false,
    },
  });
  assert.equal(matching?.text, "В каком районе Гамбурга нужен мастер?");
  assert.deepEqual(matching?.options, ["Altona", "Eimsbüttel"]);
  // Code keeps the escape hatch even when the model forgot it.
  assert.equal(matching?.allow_no_preference, true);
});

test("every field code has copy in every supported locale", () => {
  for (const code of SERVICE_INTENT_FIELD_CODES) {
    for (const locale of SERVICE_INTENT_LOCALES) {
      const question = selectNextQuestion({
        locale,
        missingFields: [code],
        resolvedFields: [],
        modelQuestion: null,
      });
      assert.equal(question?.field_code, code, `${code}/${locale}`);
      assert.ok(question && question.text.trim().length > 0, `${code}/${locale}`);
    }
  }
});

test("contact fields are not part of the question vocabulary", () => {
  for (const code of SERVICE_INTENT_FIELD_CODES) {
    assert.ok(!/name|email|phone|contact/i.test(code), code);
  }
});
